define(function(require, exports, module) {
    var SCALE = 3;

    var tools = require('app/tools');
    var util = require('app/util');
    var zoom = require('app/zoom');
    var pen = require('app/pen');
    var magicWand = require('app/magic_wand');
    var marchingAnts = require('app/marching_ants');

    var pasteBoard = document.querySelector('#pasteBoard');
    var artCanvas = document.querySelector('#artCanvas');
    var artContext = artCanvas.getContext('2d');
    var selectionCanvas = document.querySelector('#selectionCanvas');
    var selectionContext = selectionCanvas.getContext('2d');
    var penCanvas = document.querySelector('#penCanvas');

    var body = document.body;
    var loadImg = document.createElement('img');

    function showPlaceholder(e) {
        artContext.drawImage(loadImg, 0, 0);
    }

    function readFile(e) {
        e.preventDefault();

        var file = e.dataTransfer.files[0],
            reader = new FileReader();
        reader.onload = function (event) {
            if(file.type.indexOf("image") > -1){
                reloadImage(event.target.result);
            }
        };
        reader.readAsDataURL(file);

        return false;
    }

    function reloadImage(data) {
        var img = new Image();
        img.onload = function(){
            var w = img.width;
            var h = img.height;
            var winWidth = window.innerWidth;
            var winHeight = window.innerHeight;
            var level = zoom.calculateInitialZoomLevel(Math.min(winWidth/w, winHeight/h));

            artContext.clearRect(0, 0, artCanvas.width, artCanvas.height);
            artCanvas.width = artCanvas.origWidth = w;
            artCanvas.height = artCanvas.origHeight = h;
            // artContext.drawImage(img, 0, 0);

            artCanvas.origCanvas = document.createElement('canvas');
            artCanvas.origCanvas.width = w;
            artCanvas.origCanvas.height = h;
            artCanvas.origCanvas.getContext('2d').drawImage(img, 0, 0);

            zoom.zoomTo(level);
            pen.reset();
        };
        img.src = data;
    }

    function redraw(e) {
        zoom.render();
    }

    window.addEventListener('resize', redraw, false);

    // before zooming, clear marching ants
    util.Event.addEventListener('beforezoom', function(e) {
        if(!selectionCanvas.selectedPixels) return;
        marchingAnts.deselect();
        selectionContext.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
    });

    // done zooming, set correct canvas size
    // redraw selection marching ants
    util.Event.addEventListener('zoom', function(e) {
        if(!selectionCanvas.selectedPixels) return;
        var dataW = selectionCanvas.selectedPixels.width;
        var dataH = selectionCanvas.selectedPixels.height;
        var w = artCanvas.width;
        var h = artCanvas.height;

        var dataCanvas = document.createElement('canvas');
        var dataContext = dataCanvas.getContext('2d');
        dataCanvas.width = dataW;
        dataCanvas.height = dataH;
        dataContext.putImageData(selectionCanvas.selectedPixels, 0, 0);

        var tempCanvas = document.createElement('canvas');
        var tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = w;
        tempCanvas.height = h;
        tempContext.drawImage(dataCanvas, 0, 0, dataW, dataH, 0, 0, w, h);

        marchingAnts.ants(selectionCanvas, tempContext.getImageData(0, 0, w, h));
    });

    // render placeholder image
    loadImg.src = 'images/placeholder_drop.png';
    loadImg.addEventListener('load', showPlaceholder, false);

    // drag and drop
    body.ondragover = function () { return false; };
    body.ondragend = function () { return false; };
    body.ondrop = readFile;

    // ============================================
    // Tools' options
    // Magic Wand Options
    document.querySelector('#mwContiguous').onchange = function(e) {
        magicWand.contiguous = e.target.checked;
    };
    document.querySelector('#mwTolerance').onchange = function(e) {
        var tolerance = e.target.value;
        if(tolerance > 255) tolerance = 255;
        else if(tolerance < 0) tolerance = 0;
        magicWand.tolerance = tolerance / 255;
    };
    document.querySelector('#mwDeselect').onclick = function(e) {
        marchingAnts.deselect();
        selectionContext.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        selectionCanvas.selectedPixels = null;
    };

    // Pen Tool Options
    document.querySelector('#pMask').onclick = function(e) {
        var w = artCanvas.origWidth * zoom.zoomRatio;
        var h = artCanvas.origHeight * zoom.zoomRatio;
        artCanvas.isMasked = true;
        artCanvas.maskedCanvas = pen.getCanvas(artCanvas.origCanvas);
        artContext.clearRect(0, 0, artCanvas.width, artCanvas.height);
        artContext.drawImage(artCanvas.maskedCanvas, 0, 0, artCanvas.origWidth, artCanvas.origHeight, 0, 0, w, h);
    };
    document.querySelector('#pUnmask').onclick = function(e) {
        var w = artCanvas.origWidth * zoom.zoomRatio;
        var h = artCanvas.origHeight * zoom.zoomRatio;
        artCanvas.isMasked = false;
        artContext.drawImage(artCanvas.origCanvas, 0, 0, artCanvas.origWidth, artCanvas.origHeight, 0, 0, w, h);
    };

    // Zoom Tool Options
    document.querySelector('#zActual').onclick = function(e) {
        zoom.zoomTo(7);
    };
    document.querySelector('#zFit').onclick = function(e) {
        var winWidth = window.innerWidth;
        var winHeight = window.innerHeight;
        var level = zoom.fitToWindow(Math.min(winWidth/artCanvas.origWidth, winHeight/artCanvas.origHeight));
        zoom.zoomTo(level);
    };

    // init
    tools.init('#tools');
});