var cache = {}
var startIndex = 0;
var colors = ["#cfe8f3","#73bfe2","#1696d2","#0a4c6a","#000000"];
var highlightOpacity = 0.9;

// define starting variable
var curStep = "capFlowRate";
var circleOpacity = 0.8;
var fillOpacity = 0.7;

var baltlineData = 'data/joined/balt_joined5.geojson';
var hiPoints = {
	"Canton": [[-76.5712757,39.2743012]],
	"Holabird": [[-76.538202,39.26505]],
	"Dundalk": [[-76.5371497,39.2440511]],
	"Loyola": [[-76.6203821,39.3461692]],
	"Mondawmin": [[-76.654851,39.317171]],
	"Reisterstown": [[-76.704939,39.352153]],
	"Johns": [[-76.6205392,39.3284585],[-76.5488741,39.2909354]]	
}

ready();	


function returnLineheightOffset() {
	width = $(window).innerWidth();
	var lineheightoffset = {}
	if (width < 850) {
		lineheightoffset.lineheight = "0.5";
		lineheightoffset.offset = ".45";
	} else {		
		lineheightoffset.lineheight = "1.1";
		lineheightoffset.offset = ".75";
	}
	return lineheightoffset;
}

function returnllb() {
	width = $(window).innerWidth();
	if (width < 850) {
		var sw = new mapboxgl.LngLat(-76.7956027, 39.181924);
		var ne = new mapboxgl.LngLat(-76.5309037, 39.372537);
		return new mapboxgl.LngLatBounds(sw, ne);
	} else {
		var sw = new mapboxgl.LngLat(-76.7156027, 39.181924);
		var ne = new mapboxgl.LngLat(-76.5309037, 39.372537);
		return new mapboxgl.LngLatBounds(sw, ne);
	}
}

function returnPercent(first) {
	width = $(window).innerWidth();		
	if (first) {		
		if (width < 850) {
			amount = "70%"	
		} else {			
			amount = "0%"
		}
	} else {
		if (width < 850) {
			amount = "80%"	
		} else {
			amount = "40%"
		}
	}
	
	return amount;
}

function ready() {

	waypoints();
	createDots();

	longchart();
	var shortchartVars = shortchart();
	stackedchart();
	
	var map = mapDraw();	
	
	// map bounds	
	var llb = returnllb();

	// zoom to DC bounds
	map.fitBounds(llb, { duration: 0, padding: 10 })

    // Event Listeners
   	var resizeTimer;	
	window.addEventListener("resize", function(e){
	  clearTimeout(resizeTimer);
	  resizeTimer = setTimeout(function() {	   	
	  
		var llb = returnllb();

		map.fitBounds(llb, { duration: 0, padding: 10 })
		// update()
		// removeTooltip()
		// pymChild.sendHeight()

	  }, 250);

	  Waypoint.destroyAll();
	  waypoints();
	});

	$(".notes").on("mouseover",function(){
		$(this).addClass("active")
	})

	$(".notes").on("mouseout",function(){		
		$(this).removeClass("active")
	})

	$(document).on("click",function(){
		if(!$(event.target).is('b'))
		{
		    $(".notes").removeClass("active")
		}
	})

	$(document).on("mouseover",".active .highlight.choro",function(){
		highlightOnMap(this)
	})

	$(document).on("mouseout",".active .highlight.choro",function(){
		hoverout();
	})

	$(document).on("mouseover", ".active .highlight.charles", function(){
		map.setPaintProperty("charles","line-opacity", 1)
	})

	$(document).on("mouseout", ".active .highlight.charles", function(){		
		map.setPaintProperty("charles","line-opacity", 0)	
	})

	$(document).on("mouseover", ".active .highlight.point", function(){		
		var pointName = $(this).attr("id");
		highlightPoint(hiPoints[pointName])
	})

	$(document).on("mouseout", ".active .highlight.point", function(){		
		map.setPaintProperty("highlightPointy", "circle-opacity",0)
	})

	// helper function so we can map over dom selection
	function selectionToArray(selection) {
		var len = selection.length
		var result = []
		for (var i = 0; i < len; i++) {
			result.push(selection[i])
		}
		return result
	}

	// create waypoints for 
	function waypoints() {
		// select elements
		var graphicEl = document.querySelector('#story-container')
		var graphicVisEl = graphicEl.querySelector('#sticky-right')
		var triggerEls = selectionToArray(graphicEl.querySelectorAll('.trigger'))

		// viewport height
		var viewportHeight = window.innerHeight
		var halfViewportHeight = Math.floor(viewportHeight / 2)

		// a global function creates and handles all the vis + updates
		// var graphic = createGraphic('.graphic')

		// handle the fixed/static position of grahpic
		var toggle = function(fixed, bottom) {
			if (fixed) graphicVisEl.classList.add('is-fixed')
			else graphicVisEl.classList.remove('is-fixed')

			if (bottom) graphicVisEl.classList.add('is-bottom')
			else graphicVisEl.classList.remove('is-bottom')
		}
		
		// setup a waypoint trigger for each trigger element
		var waypoints = triggerEls.map(function(el) {
			
			// get the step, cast as number					
			var step = +el.getAttribute('data-step')

			return new Waypoint({
				element: el, // our trigger element
				handler: function(direction) {
					// if the direction is down then we use that number,
					// else, we want to trigger the previous one
					var nextStep = direction === 'down' ? step : Math.max(0, step - 1)				

					if (direction === 'down') {
						var nextStep = step;
						var dataName = el.getAttribute('data-name');

					} else {
						var nextStep = Math.max(0, step - 1)
						try {							
							var dataName = $(el)[0].previousElementSibling.getAttribute('data-name');
						} 
						catch(err) {
							var dataName = el.getAttribute('data-name');
						}
					}

					// tell our graphic to update with a specific step
					try {
						curStep = dataName;
						updateChart(nextStep, dataName)	
					}
					catch(err) {
						cache.nextStep = nextStep;
						cache.dataName = dataName;
					}
					
				},
				offset: returnPercent(false),  // trigger halfway up the viewport
			})
		})

		// enter (top) / exit (bottom) graphic (toggle fixed position)
		var enterWaypoint = new Waypoint({
			element: graphicEl,
			handler: function(direction) {
				var fixed = direction === 'down'
				var bottom = false
				toggle(fixed, bottom)
			},
			offset: returnPercent(true)
		})

		var exitWaypoint = new Waypoint({
			element: graphicEl,
			handler: function(direction) {
				var fixed = direction === 'up'
				var bottom = !fixed
				toggle(fixed, bottom)
			},
			offset: 'bottom-in-view', // waypoints convenience instead of a calculation
		})
	}

	function createDots() {
		// Count number of "trigger"
		var numTriggers = $('.trigger').length
		// create div for each
		for (var i = 0; i < numTriggers; i++) {
			// get item label

			var name = $('.trigger')[i].getAttribute('data-name');
			var itemLabel = varListMaster[name].sectionTitle;
			
			// append items
			$(".bubble-nav").append("<div class='bubble'><div class='label'><p class='bubble-text'>" + itemLabel +"</p></div></div>");			
			
			// add h2's onto the divs. 
			$(".slide.trigger[data-name="+ name +"] .div-section-divider").after("<h2>" + itemLabel + "</h2>");	
		}
		
		// set first to active
		// $(".bubble").first().addClass("active")
		
		// create clearing div below everything
		$(".bubble-nav").append("<div class='clearer'></div>")
	}	

	function updateChart(nextStep,dataName) {
		$(".trigger").removeClass("active")
		$(".trigger[data-name='" + dataName + "']").attr("data-name",dataName).addClass("active")

		clearHighlights();

		// update left-hand nav		
		$(".bubble").removeClass("active")

		$(".bubble:nth-child(" + (nextStep+1) +")").addClass("active")

		$(".chart-type").addClass("inactive")

		if (varListMaster[dataName].chartType !== "hor-bar-chart") {
			shortchartVars.active = "interstitial";
			advanceChart(shortchartVars,"interstitial",true)	
		}
		
		if (varListMaster[dataName].chartType === "poly-map" || varListMaster[dataName].chartType === "dot-map") {
			$("#map").removeClass("inactive")
			advanceMap(map, dataName)	
		} else if (varListMaster[dataName].chartType === "long-bar-chart") {
			$("#chartLong").removeClass("inactive");
		} else if (varListMaster[dataName].chartType === "hor-bar-chart") {			
			$("#chartSmall").removeClass("inactive")
			advanceChart(shortchartVars,dataName,false)
		} else if (varListMaster[dataName].chartType === "stacked-bar-chart") {			
			$("#chartStacked").removeClass("inactive")
		}
		// update inside of the chart
		// use try???? if item is below the fold on load, don't shoot error
		
		// $(".graphic div").html(nextStep)
		$("#n1").html(varListMaster[dataName].sources)
		if (varListMaster[dataName].notes !== "") {
			$("#n2").html(varListMaster[dataName].notes)
		} else {
			$("#n2").html('')
		}
		
	}

	function mapDraw() {

	////// Initial map and other initial items//////
		mapboxgl.accessToken = 'pk.eyJ1IjoidXJiYW5pbnN0aXR1dGUiLCJhIjoiTEJUbmNDcyJ9.mbuZTy4hI_PWXw3C3UFbDQ';
		var map = new mapboxgl.Map({
		  container: 'map', 
		  style: 'mapbox://styles/urbaninstitute/cjm9fzb762tdd2ro26791vasq',
		  interactive: false
		});

		return map;
	}


	function advanceChart(shortchartVars,dataName,background) {

		// allows it to update in the background for better transitions. 

		// This selection only happens when NOT in the background
		if (!background) {
			$("#chartSmall .title").html("<h4>" + varListMaster[dataName].chartTitle + "</h4>")			
		}

		shortchartVars.active = dataName;

		var x = shortchartVars.x;
		x.domain([0, d3.max(shortchartVars.data, function(d) { return d[dataName]; })]).nice();

		var g = shortchartVars.g;

		// transition bars
		d3.select("#chartSmall").selectAll(".bar").transition()
	    	.attr("width", function(d) { 
	    		return x(d[dataName])
	    	})
	   
	   	d3.select("#chartSmall").select("g.x.axis").transition()
	   		.call(d3.axisBottom(x).ticks(4).tickFormat(function(d) { return d3.format("$,.0r")(d) }).tickSizeInner([-shortchartVars.Chartheight]));	    	
	}


	// Create the highlight on the map for hoverover
	function highlightOnMap(dis) {
		if ($(dis).hasClass("race")) {
			var type = "AfAmPct_numeric";
			if ($(dis).hasClass("low")) {
				var pick = 1;
				var data = "aflow.geojson"
			} else {
				var pick = 3;
				var data = "afhigh.geojson"
			}	
		} else if ($(dis).hasClass("pov")) {
			var type = "HighPov_numeric";
			if ($(dis).hasClass("low")) {
				var pick = 0;
				var data = "povlow.geojson"
			} else {
				var pick = 1;
				var data = "povhigh.geojson"
			}	
		} else if ($(dis).hasClass("cbd")){
			var type = "cbd";
			var pick = 1;
			var data = "cbd.geojson"
		} else if ($(dis).hasClass("ozs")) {
			var type = "ozs";
			var pick = 1;
			var data = "ozs.geojson"
		}

		map.setPaintProperty("urban-areas-fill2", 
			'fill-opacity', 
				[	
	                'match',	                
	                ['to-number',['get', type]],
	               	[pick], 0,
	               	highlightOpacity
	            ]
			)

			// // if we also to do the tract lines illuminated

		map.setPaintProperty("hilines", "line-opacity",1)
		map.getSource('hilines').setData('data/joined/' + data);

	}	

	function hoverout() {
		// map.setPaintProperty("balt-tract-lines2","line-opacity",0)
		map.setPaintProperty("urban-areas-fill2", 'fill-opacity', 0)		
		map.setPaintProperty("hilines", "line-opacity",0)

	}

	function highlightPoint(points) {
		var pointsUnpacked = [];
		for (var i = 0; i < points.length; i++) {
			pointsUnpacked.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": points[i]
                }
           	})
		}


		map.setPaintProperty("highlightPointy", "circle-opacity",1)
		map.getSource('highlightPointy').setData({
                "type": "FeatureCollection",
                "features": pointsUnpacked
            });
	}

	function clearHighlights() {
		hoverout();
		map.setPaintProperty("charles","line-opacity", 0)	
		map.setPaintProperty("highlightPointy", "circle-opacity",0)
	}

	function advanceMap(map, item) {
		if (item === "raceMap") {
			map.setPaintProperty("urban-areas-fill",'fill-opacity',0)
			map.setPaintProperty("balt-tract-lines",'line-opacity',0)
			map.setPaintProperty("dots",'circle-opacity',circleOpacity)
			$(".choromap").removeClass("active")
			$(".dotmap").addClass("active")
			$("#map .title").html("<h4>" + varListMaster[item].chartTitle + "</h4>")
		} else {
			map.setPaintProperty("dots",'circle-opacity',0)
			map.setPaintProperty("urban-areas-fill", 'fill-opacity', fillOpacity)
			map.setPaintProperty("balt-tract-lines", 'line-opacity', 1)
			map.setPaintProperty("urban-areas-fill", 
				'fill-color', [
	                'step',	                
	                // The following is the buckets for the maps..
	                ['to-number',['get', item]],
	                // "#ff00ff", 1,
					colors[0],varListMaster[item].range[1], 
					colors[1],varListMaster[item].range[2], 
					colors[2],varListMaster[item].range[3], 
					colors[3],varListMaster[item].range[4], 
					colors[4]	 
					// Last color is anything above range[4]
	            ]	           
	            );
			// set the legend 
			$(".choromap").addClass("active")
			$(".dotmap").removeClass("active")			
			$("#map .title").html("<h4>" + varListMaster[item].chartTitle + "</h4>")
			$("#c1 span").text(function(){
				if (varListMaster[item].range[1] === 0) {
					return "$0"
				} else {
					return "Less than " + formatter(varListMaster[item].range[1]);
				}
				
			});
			$("#c2 span").text(formatter(varListMaster[item].range[1])+"–"+formatter(varListMaster[item].range[2]));
			$("#c3 span").text(formatter(varListMaster[item].range[2])+"–"+formatter(varListMaster[item].range[3]));
			$("#c4 span").text(formatter(varListMaster[item].range[3])+"–"+formatter(varListMaster[item].range[4]));
			$("#c5 span").text("More than " + formatter(varListMaster[item].range[4]))
		}

	}

	map.on('load', function () {
		
		var layers = map.getStyle().layers;
		// console.log(layers)
	    // Find the index of the first symbol layer in the map style
	    var firstSymbolId;
	    for (var i = 0; i < layers.length; i++) {
	        if (layers[i].type === 'symbol') {
	            firstSymbolId = layers[i].id;
	            break;
	        }
	    }
	    
	    map.addLayer({
	        'id': 'urban-areas-fill',
	        'type': 'fill',
	        'source': {
	            'type': 'geojson',
	            'data': baltlineData
	        },
	        'layout': {},
			'paint': {
				'fill-opacity': 0
				// 'fill-opacity': [
				// 	  "match",
				// 	  ["get", "HighPov_numeric"],
				// 	  ["1"],
				// 	  fillOpacity,		
				// 	  .1
				// 	]
			}
		// Do not remove, this is how you would bring the neighborhood name layer on top
    	// }, firstSymbolId);
    	});

    	map.addLayer({
	        'id': 'urban-areas-fill2',
	        'type': 'fill',
	        'source': {
	            'type': 'geojson',
	            'data': baltlineData
	        },
	        'layout': {},
			'paint': {
				'fill-opacity': 0,
				'fill-color': "#fff"
			}
    	});


    	map.addLayer({
	        'id': 'balt-tract-lines',
	        'type': 'line',
	        'source': {
	            'type': 'geojson',
	            'data': baltlineData
	        },
	        'layout': {},
			"paint": {
	            "line-color": "#fff",
	            "line-width": 1
	        }			
    	});

	    map.addLayer({
	        'id': 'dots',
	        'type': 'circle',
	        'source': {
	            'type': 'vector',
	            'url': 'mapbox://urbaninstitute.1lmj6hin'
	        },
	        'source-layer':'combined_race_200-cg5tla',
	        'layout': {},
			'paint': {'circle-color':[
			  "match",
			  ["get", "type"],
			  "aapi",
			  "#000",
			  "hisp",
			  "#fdbf11",
			  "white",
			  "#ec008b",
			  "black",
			  "hsl(199, 81%, 45%)",
			  "#fdbf11"
			],
			'circle-radius':[
			  "interpolate",
			  ["exponential", 1.06],
			  ["zoom"],
			  0,
			  1,
			  14,
			  4,
			  22,
			  15
			],
			'circle-opacity':0
			}
    	});

    	map.addLayer({
	        'id': 'charles',
	        'type': 'line',
	        'source': {
	            'type': 'geojson',
	            'data': 'data/charles.geojson'
	        },
	        'layout': {},
			"paint": {
	            "line-color": "#fdbf11",
	            "line-width": 3,
	            "line-opacity":0
	        }			
    	});

    	map.addLayer({
            "id": "highlightPointy",
            "type": "circle",
            "source":{
                "type": "geojson",
                "data": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [0,0]
                        }
                    }]
                }
            },
            'paint': {'circle-color': "#fdbf11",'circle-radius':8}
        });

    	map.addLayer({
	        'id': 'hilines',
	        'type': 'line',
	        'source': {
	            'type': 'geojson',
	            'data': 'data/joined/afhigh.geojson'
	        },
	        'layout': {},
			"paint": {
	            "line-color": "#fdbf11",
	            "line-width": 3,
	            "line-opacity":0
	        }			
    	});

   		if (!isNaN(cache.nextStep)) {
   			updateChart(cache.nextStep, cache.dataName)		
   		}   	
	})


	// $("button").click(function(){
	// 	advanceMap(map, "AnnualCRAp")
	// })

	// initialize click function for lefthand nav bubbles
	$(".bubble").click(function(){
		// Get div index
		var index = $(this).parent().children().index(this)
		// Get div
		var mover = $(".trigger").eq(index)		

		// Scroll to div
		$('html,body').animate({
        	scrollTop: mover.offset().top - 100},
        	'slow');
	})
}

// wrap text
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeightOffset = returnLineheightOffset(), // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", -5).attr("y", y).attr("dy", (dy-lineHeightOffset.offset) + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", -5).attr("y", y).attr("dy", ++lineNumber * lineHeightOffset.lineheight + (dy) + "em").text(word);
      }
    }
  });
}

function formatter(num) {
	if (num > 1) {
		return d3.format("$,.2r")(num)
	} else if(num === 0){
		return d3.format("$,.0r")(num)
	} else {
		return d3.format(",.0%")(num)
	}
}