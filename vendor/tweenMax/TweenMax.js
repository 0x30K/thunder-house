window.requestAnimFrame = (function() {
		return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function(callback, element) {
						window.setTimeout(callback, 4000 / 30);
				};
})();

function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
}
	
var c = document.getElementById('canv'),
	
		$ = c.getContext('2d'),
		w = c.width = window.innerWidth,
		h = c.height = window.innerHeight,
		minX = 20,
		minY = 20,
		varX = (w / 10) - (minX / 10),
		varY = h - (minY * 2),
		w1 = (w - (minX * 2) - varX) / 4,
		piRatio = Math.PI / 180,
		debug = false,
		clearTheFrame = true,
		tension = 0.9,
		numberOfCurves = 80,
		TimeOnCurve = 1/(numberOfCurves),
		minTime = 8,
		maxTime = 15,
		minDelay = 0,
		maxDelay = 5,
		CurvesArray = [],
		alpha = 1,
		yellowStart = 'hsla(45, 100%, 60%, 0)',
		yellow = 'hsla(45, 100%, 60%, '+ alpha +')',
		red = 'hsla(11, 100%, 50%, '+ alpha +')',
		blue = 'hsla(242, 100%, 50%, '+ alpha +')',
		blueEnd = 'hsla(242, 100%, 50%, 0)',
		gradientArray = [];

var curve1 = {
		x1: minX,
		y1: minY,
		x2: minX,
		y2: minY + (varY * (4 / 3)),
		x3: minX,
		y3: minY
}

var curve2 = {
		x1: minX + w1,
		y1: h - minY,
		x2: minX + w1 + (varX / 2),
		y2: minY - (varY / 2),
		x3: minX + w1 + varX,
		y3: h - minY
}

var curve3 = {
		x1: minX + (w1 * 2),
		y1: minY,
		x2: minX + (w1 * 2) + (varX / 2),
		y2: minY + (varY * (4 / 3)),
		x3: minX + (w1 * 2) + varX,
		y3: minY
}

var curve4 = {
		x1: minX + (w1 * 3),
		y1: h - minY,
		x2: minX + (w1 * 3) + (varX / 2),
		y2: minY - (varY / 2),
		x3: minX + (w1 * 3) + varX,
		y3: h - minY
}
var curve5 = {
		x1: w - minX,
		y1: minY,
		x2: w - minX,
		y2: minY + (varY * (4 / 3)),
		x3: w - minX,
		y3: minY
}

$.globalCompositeOperation = "source-over";

window.addEventListener('resize', function() {
		c.width = window.innerWidth;
		c.height = window.innerHeight;
		ready();
}, false);

var ready = function() {
		
		w = c.width = window.innerWidth,
				h = c.height = window.innerHeight,
				varX = (w / 10) - (minX / 10),
				varY = h - (minY * 9),
				w1 = (w - (minX * 2) - varX) / 4,
		
		createGradients();
		curve1.x1 = minX;
		curve1.x2 = minX;
		curve1.x3 = minX;	

		curve2.x1 = minX + w1;
		curve2.x2 = minX + w1 + (varX / 2);
		curve2.x3 = minX + w1 + varX;	

		curve3.x1 = minX + (w1 * 2);
		curve3.x2 = minX + (w1 * 2) + (varX / 2);
		curve3.x3 = minX + (w1 * 2) + varX;	

		curve4.x1 = minX + (w1 * 3);
		curve4.x2 = minX + (w1 * 3) + (varX / 2);
		curve4.x3 = minX + (w1 * 3) + varX;	

		curve5.x1 = w - minX;
		curve5.x2 = w - minX;
		curve5.x3 = w - minX;	
}

var clearFrame = function() {

		if (clearTheFrame == true) {
				$.clearRect((minX-1), 0, (w-(minX*2)+2), h); // only clear the bits we draw on
		}

		//draw quadratic curves that contain the points for the animation
		if (debug == true) { 
				$.strokeStyle='grey';
				$.beginPath();
				$.moveTo(curve1.x1, curve1.y1);
				$.quadraticCurveTo(curve1.x2, curve1.y2, curve1.x3, curve1.y3);

				$.moveTo(curve2.x1, curve2.y1);
				$.quadraticCurveTo(curve2.x2, curve2.y2, curve2.x3, curve2.y3);

				$.moveTo(curve3.x1, curve3.y1);
				$.quadraticCurveTo(curve3.x2, curve3.y2, curve3.x3, curve3.y3);

				$.moveTo(curve4.x1, curve4.y1);
				$.quadraticCurveTo(curve4.x2, curve4.y2, curve4.x3, curve4.y3);

				$.moveTo(curve5.x1, curve5.y1);
				$.quadraticCurveTo(curve5.x2, curve5.y2, curve5.x3, curve5.y3);
				$.stroke();
				$.closePath();
		}
}

var tweenCurves = function() {
		MainTL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve1TL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve1y1 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve1y1
				.to(curve1, getRandomInt(minTime, maxTime), {
						y1: h - minY,
						ease: Power2.easeInOut
				})
		Curve1y2 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve1y2
				.to(curve1, getRandomInt(minTime, maxTime), {
						y2: minY - (varY / 2),
						ease: Power2.easeInOut
				})
		Curve1y3 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve1y3
				.to(curve1, getRandomInt(minTime, maxTime), {
						y3: h - minY,
						ease: Power2.easeInOut
				});

		Curve1TL
				.add(Curve1y1, "start")
				.add(Curve1y2, "start")
				.add(Curve1y3, "start")

		Curve2TL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve2y1 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve2y1
				.to(curve2, getRandomInt(minTime, maxTime), {
						y1: minY,
						ease: Power2.easeInOut
				})
		Curve2y2 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve2y2
				.to(curve2, getRandomInt(minTime, maxTime), {
						y2: minY + (varY * (4 / 3)),
						ease: Power2.easeInOut
				})
		Curve2y3 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve2y3
				.to(curve2, getRandomInt(minTime, maxTime), {
						y3: minY,
						ease: Power2.easeInOut
				});

		Curve2TL
				.add(Curve2y1, "start")
				.add(Curve2y2, "start")
				.add(Curve2y3, "start")

		Curve3TL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve3y1 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve3y1
				.to(curve3, getRandomInt(minTime, maxTime), {
						y1: h - minY,
						ease: Power2.easeInOut
				})
		Curve3y2 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve3y2
				.to(curve3, getRandomInt(minTime, maxTime), {
						y2: minY - (varY / 2),
						ease: Power2.easeInOut
				})
		Curve3y3 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve3y3
				.to(curve3, getRandomInt(minTime, maxTime), {
						y3: h - minY,
						ease: Power2.easeInOut
				});

		Curve3TL
				.add(Curve3y1, "start")
				.add(Curve3y2, "start")
				.add(Curve3y3, "start")

		Curve4TL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve4y1 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve4y1
				.to(curve4, getRandomInt(minTime, maxTime), {
						y1: minY,
						ease: Power2.easeInOut
				})
		Curve4y2 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve4y2
				.to(curve4, getRandomInt(minTime, maxTime), {
						y2: minY + (varY * (4 / 3)),
						ease: Power2.easeInOut
				})
		Curve4y3 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve4y3
				.to(curve4, getRandomInt(minTime, maxTime), {
						y3: minY,
						ease: Power2.easeInOut
				});

		Curve4TL
				.add(Curve4y1, "start")
				.add(Curve4y2, "start")
				.add(Curve4y3, "start")

		Curve5TL = new TimelineMax({
				paused: false,
				yoyo: true,
				repeat: -1
		});

		Curve5y1 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve5y1
				.to(curve5, getRandomInt(minTime, maxTime), {
						y1: h - minY,
						ease: Power2.easeInOut
				})
		Curve5y2 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve5y2
				.to(curve5, getRandomInt(minTime, maxTime), {
						y2: minY - (varY / 2),
						ease: Power2.easeInOut
				})
		Curve5y3 = new TimelineMax({
				paused: false,
				yoyo: true,
				delay: getRandomInt(minDelay, maxDelay),
				repeat: -1
		});
		Curve5y3
				.to(curve5, getRandomInt(minTime, maxTime), {
						y3: h - minY,
						ease: Power2.easeInOut
				});

		Curve5TL
				.add(Curve5y1, "start")
				.add(Curve5y2, "start")
				.add(Curve5y3, "start")

		MainTL
				.add(Curve1TL, "MainStart")
				.add(Curve2TL, "MainStart")
				.add(Curve3TL, "MainStart")
				.add(Curve4TL, "MainStart")
				.add(Curve4TL, "MainStart")
}

function drawCurve(ctx, ptsa, tension, isClosed, numOfSegments, showPoints) {

    showPoints  = showPoints ? showPoints : false;

    ctx.beginPath();

    drawLines(ctx, getCurvePoints(ptsa, tension, isClosed, numOfSegments));
		
		ctx.stroke();
    ctx.closePath();

    if (showPoints) {
        ctx.stroke();
        ctx.beginPath();
        for(var i=0;i<pts.length-1;i+=2) 
                ctx.rect(pts[i] - 2, pts[i+1] - 2, 4, 4);
    }
}

function getCurvePoints(ptsa, tension, isClosed, numOfSegments) {

    // use input value if provided, or use a default value   
    tension = (typeof tension != 'undefined') ? tension : 0.5;
    isClosed = isClosed ? isClosed : false;
    numOfSegments = numOfSegments ? numOfSegments : 16;

    var _pts = [], res = [],    // clone array
        x, y,           // our x,y coords
        t1x, t2x, t1y, t2y, // tension vectors
        c1, c2, c3, c4,     // cardinal points
        st, t, i;       // steps based on num. of segments

    // clone array so we don't change the original
    _pts = ptsa.slice(0);

    // The algorithm require a previous and next point to the actual point array.
    // Check if we will draw closed or open curve.
    // If closed, copy end points to beginning and first points to end
    // If open, duplicate first points to befinning, end points to end
    if (isClosed) {
        _pts.unshift(ptsa[ptsa.length - 1]);
        _pts.unshift(ptsa[ptsa.length - 2]);
        _pts.unshift(ptsa[ptsa.length - 1]);
        _pts.unshift(ptsa[ptsa.length - 2]);
        _pts.push(ptsa[0]);
        _pts.push(ptsa[1]);
    }
    else {
        _pts.unshift(ptsa[1]);   //copy 1. point and insert at beginning
        _pts.unshift(ptsa[0]);
        _pts.push(ptsa[ptsa.length - 2]); //copy last point and append
        _pts.push(ptsa[ptsa.length - 1]);
    }

    // ok, lets start..

    // 1. loop goes through point array
    // 2. loop goes through each segment between the 2 pts + 1e point before and after
    for (i=2; i < (_pts.length - 4); i+=2) {
        for (t=0; t <= numOfSegments; t++) {

            // calc tension vectors
            t1x = (_pts[i+2] - _pts[i-2]) * tension;
            t2x = (_pts[i+4] - _pts[i]) * tension;

            t1y = (_pts[i+3] - _pts[i-1]) * tension;
            t2y = (_pts[i+5] - _pts[i+1]) * tension;

            // calc step
            st = t / numOfSegments;

            // calc cardinals
            c1 =   2 * Math.pow(st, 3)  - 3 * Math.pow(st, 2) + 1; 
            c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2); 
            c3 =       Math.pow(st, 3)  - 2 * Math.pow(st, 2) + st; 
            c4 =       Math.pow(st, 3)  -     Math.pow(st, 2);

            // calc x and y cords with common control vectors
            x = c1 * _pts[i]    + c2 * _pts[i+2] + c3 * t1x + c4 * t2x;
            y = c1 * _pts[i+1]  + c2 * _pts[i+3] + c3 * t1y + c4 * t2y;

            //store points in array
            res.push(x);
            res.push(y);

        }
    }

    return res;
}

function drawLines(ctx, pts) {
    ctx.moveTo(pts[0], pts[1]);
    for(i=2;i<pts.length-1;i+=2) ctx.lineTo(pts[i], pts[i+1]);
}

function pointOnLine(time, startx, midx, endx, starty, midy, endy){
	var t = time; // given example value
	var x = (1 - t) * (1 - t) * startx + 2 * (1 - t) * t * midx + t * t * endx;
	var y = (1 - t) * (1 - t) * starty + 2 * (1 - t) * t * midy + t * t * endy;
	
	return {xVal: x, yVal: y};
}

function returnPoints(time) {
		var Points = [];
	
		var returnVal1 = pointOnLine(time, curve1.x1, curve1.x2, curve1.x3, curve1.y1, curve1.y2, curve1.y3);
		var returnVal2 = pointOnLine(time, curve2.x1, curve2.x2, curve2.x3, curve2.y1, curve2.y2, curve2.y3);
		var returnVal3 = pointOnLine(time, curve3.x1, curve3.x2, curve3.x3, curve3.y1, curve3.y2, curve3.y3);
		var returnVal4 = pointOnLine(time, curve4.x1, curve4.x2, curve4.x3, curve4.y1, curve4.y2, curve4.y3);
		var returnVal5 = pointOnLine(time, curve5.x1, curve5.x2, curve5.x3, curve5.y1, curve5.y2, curve5.y3);
		
		Points = [returnVal1.xVal,returnVal1.yVal, returnVal2.xVal,returnVal2.yVal, returnVal3.xVal,returnVal3.yVal, returnVal4.xVal,returnVal4.yVal, returnVal5.xVal,returnVal5.yVal]; 
	
		return Points;
}



function createGradients() {
	alpha = 1;
	gradientArray = [];
	for (k=0; k < numberOfCurves; k++) {
			alpha -= 0.019;
			yellow = 'hsla(45, 100%, 60%, '+ alpha +')';
			red = 'hsla(11, 100%, 50%, '+ alpha +')';
			blue = 'hsla(242, 100%, 50%, '+ alpha +')';
			blueEnd = 'hsla(242, 100%, 50%, 0)';
			var gradient=$.createLinearGradient(0,0,(c.width - (minX*2)),0);
			gradient.addColorStop("0",yellowStart);
			gradient.addColorStop("0.1",yellow);
			gradient.addColorStop("0.5",red);
			gradient.addColorStop("0.9",blue);
			gradient.addColorStop("1",blueEnd);
			// Fill array with gradient
			gradientArray[k] = gradient;
		}
}

var animate = function() {
		clearFrame();
	
		$.lineWidth=2;
		$.globalAlpha = 0.4;
	
		CurvesArray[0] = [curve1.x1,curve1.y1, curve2.x1,curve2.y1, curve3.x1,curve3.y1, curve4.x1,curve4.y1, curve5.x1,curve5.y1];
		for (i=1; i < (numberOfCurves); i++) {
				CurvesArray[i] = returnPoints(TimeOnCurve*i);
		}
		CurvesArray[numberOfCurves] = [curve1.x3,curve1.y3, curve2.x3,curve2.y3, curve3.x3,curve3.y3, curve4.x3,curve4.y3, curve5.x3,curve5.y3];
	
		for (j=0; j < CurvesArray.length; j++) {
			$.strokeStyle=gradientArray[j];
			drawCurve($, CurvesArray[j], tension);
		}
	
		window.requestAnimFrame(animate);
}
ready();
tweenCurves();
animate();