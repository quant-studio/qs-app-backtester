//=============================
angular.module('quant-studio', ['quant-studio-ui', 'ui.ace'])

.directive('appMain', function() {
	var component = function($scope, element, attrs, ctlr, transcludeFn) {
		
		// Utilities
		$scope.safeApply = function(fn) {
			var phase = this.$root.$$phase;
			if(phase == '$apply' || phase == '$digest') {
				if(fn && (typeof(fn) === 'function')) {
					fn();
				}
			} else {
				this.$apply(fn);
			}
		};
		
		// To make it easier to output HTML
		var output = function(status, details) {
			$('#output').append($('<div>'+status+'</div>'));
			console.log(status, details);
		}
		
		
		$scope.tabs	= {
			selected:	'datasource',
			select:		function(id) {
				$scope.safeApply(function() {
					switch (id) {
						default:
							$scope.tabs.selected	= id;
						break;
					}
				});
			},
			is:		function(id) {
				return $scope.tabs.selected	== id;
			}
		};
		
		
		
		/*
			Backtesting
		*/
		$scope.backtester = {
			showDropOverlay:	false,
			settings: {
				datasources: {
					
				},
				positions: {
					
				}
			},
			init:	function(sdkData) {
				$scope.safeApply(function() {
					$scope.backtester.settings	= sdkData.app.data;
					$scope.backtester.onProjectChange(sdkData.project);
				});
			},
			datasource: {
				types:	[{
					label:	'CSV',
					value:	'csv'
				}, {
					label:	'TSV',
					value:	'tsv'
				}, {
					label:	'Project data',
					value:	'project'
				}],
				setType:	function(type) {
					$scope.backtester.settings.datasource.type	= type;
					switch (type) {
						case "csv":
							$scope.backtester.settings.datasource.type	= type;
						break;
						case "project":
							
						break;
					}
				},
				test:	function() {
					$scope.backtester.datasource.loadFromURL($scope.backtester.settings.datasource.csvSource, function(response) {
						var csv = $scope.backtester.datasource.parseCSV(response);
					});
				},
				loadFromURL:	function(url, callback) {
					var obj = {
						url:		url,
						method: 	"GET",
						qs:			{},
						headers:	{}
					};
					var ajaxObj = {
						url: 		obj.url,
						type:		obj.method||'POST',
						data:		obj.qs,
						headers:	obj.headers,
						success: 	function(response, status){
							callback(response);
						},
						error: function(jqXHR, data, errorThrown) {
							console.log("error", jqXHR, data, errorThrown);
							console.log({
								status:	'Request Error',
								error:	errorThrown,
								data:	data
							});
						}
					};
					$.ajax(ajaxObj);
				},
				parseCSV:	function(csvString) {
					var lines = csvString.split(/\r?\n/);
					var header	= lines[0].split(',');
					var lines	= _.map(lines.slice(1), function(line) {
						var cells	= line.split(',');
						var output = {};
						_.each(cells, function(cell, n) {
							if (header[n]=='date') {
								output[header[n]] = moment(cell).toDate();
							} else {
								output[header[n]] = cell.indexOf('.')==-1?parseInt(cell):parseFloat(cell);
							}
						});
						return output;
					});
					return lines;
				}
			},
			positions: {
				ops: [{
					label:	'==',
					value:	'=='
				},{
					label:	'Cross Over',
					value:	'cross-over'
				},{
					label:	'Cross Below',
					value:	'cross-below'
				}],
				types: [{
					label:	'Buy',
					value:	'buy'
				},{
					label:	'Sell',
					value:	'sell'
				}],
				remove:	function(portId) {
					var c = confirm("Are you sure?");
					if (!c) {
						return false;
					}
					$scope.safeApply(function() {
						delete $scope.backtester.settings.positions[portId];
					});
				}
			},
			// Update the UI when the project is updated, in case there's a new datasource
			onProjectChange:	function(project) {
				$scope.safeApply(function() {
					// Init the datasource values
					_.each(project.boxes, function(box) {
						if (box.box=='datasource') {
							if (!$scope.backtester.settings.datasources[box.id]) {
								$scope.backtester.settings.datasources[box.id] = {
									type:	'project',
									url:	'http://localhost:8080/data/AAPL.csv'
								}
							}
						}
					});
					$scope.backtester.project	= project;
				});
			},
			// Add a signal when a port is dropped on the app
			addSignalFromDrop:	function(data) {
				// Swich to the positions tab
				$scope.tabs.select('positions');
				
				var portId	= data.data.box+':'+data.data.id;
				
				if (!$scope.backtester.settings.positions[portId]) {
					$scope.backtester.settings.positions[portId] = {
						label:	data.data.label,
						box:	data.data.box,
						port:	data.data.id,
						type:	'buy',
						condition: {
							op:		'==',
							value:	1
						}
					};
					if (data.data.label.match(/sell/gmi)) {
						$scope.backtester.settings.positions[portId].type = 'sell';
					}
				}
				//console.log("addSignalFromDrop",data);
				/*
				// Access the dataset for that box, from the datasets the SDK obtained from the project:
				var dataset = sdk.data['datasets'][data.data.box];
				// Filter the ports, keep only the date and that port:
				var filtered = _.map(dataset, function(item) {
					var obj = {
						d:	item.d	// Keep the date
					};
					// Keep the port that was dragged, renamed it with the column name
					obj[data.data.label] = item[data.data.box+':'+data.data.id]; // keep the property "boxId:portId"
					return obj;
				});
				console.log("Data output from that port: ", filtered);*/
			}
		}
		
		
		
		// Save the app data whenever it changes
		$scope.$watch('backtester.settings', function(a, b) {
			if ($scope.backtester.settings) {
				console.log("$scope.backtester.settings", $scope.backtester.settings);
				sdk.send('save:app', JSON.parse(angular.toJson($scope.backtester.settings)));
			}
		}, true);
		
		
		
		
		
		// 
		sdk.onInit(function() {
			console.log("App started");
			$scope.backtester.init(sdk.data);
		});
		
		// 
		sdk.onDatasetUpdate(function(datasets) {
			console.log("Datasets update received", datasets);
		});
		
		// 
		sdk.onProjectChange(function(project) {
			console.log("Project update received", project);
			$scope.backtester.onProjectChange(project);
		});
		
		// Port drag & drop
		sdk.onDrag(function(eventType, data) {
			switch (eventType) {
				case "start":
					//console.log("[drag] Started -> "+data.data.box+':'+data.data.id, data);
					$scope.safeApply(function() {
						$scope.backtester.showDropOverlay	= true;
					});
				break;
				case "move":
					if (data.end.left > 0 && data.end.top > 0) {
						//console.log("[drag] Hover ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
						if (!$scope.backtester.dropOver) {
							$scope.safeApply(function() {
								$scope.backtester.dropOver	= data.data.label;
							});
						}
					} else {
						if ($scope.backtester.dropOver) {
							$scope.safeApply(function() {
								$scope.backtester.dropOver	= false;
							});
						}
						//console.log("[drag] Moving ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
						
					}
				break;
				case "end":
					$scope.safeApply(function() {
						$scope.backtester.showDropOverlay	= false;
					
						if (data.end.left > 0 && data.end.top > 0) {
							$scope.backtester.addSignalFromDrop(data);
							/*
							// Access the dataset for that box, from the datasets the SDK obtained from the project:
							var dataset = sdk.data['datasets'][data.data.box];
							// Filter the ports, keep only the date and that port:
							var filtered = _.map(dataset, function(item) {
								var obj = {
									d:	item.d	// Keep the date
								};
								// Keep the port that was dragged, renamed it with the column name
								obj[data.data.label] = item[data.data.box+':'+data.data.id]; // keep the property "boxId:portId"
								return obj;
							});
							console.log("Data output from that port: ", filtered);
							*/
						} else {
							//console.log("[drag] Ended outside the app -> "+data.data.box+':'+data.data.id, data);
						}
					});
				break;
			}
			
		});
		
	};
	return {
		link: 			component,
		scope:			{
			
		},
		templateUrl:	'/js/app/app.html'
	};
})
.directive('ngEnter', function () {
	return function (scope, element, attrs) {
		element.bind("keypress", function (event) {
			if (event.which === 13) {
				scope.$apply(function () {
					scope.$eval(attrs.ngEnter);
				});
				event.preventDefault();
				this.blur();
			}
		});
	};
})
.directive('ngEscape', function () {
	return function (scope, element, attrs) {
		var target	= $(element);
		if (attrs.global) {
			target	= $(document);
		}
		target.on("keypress", function (event) {
			if (event.keyCode === 27) {
				scope.$apply(function () {
					scope.$eval(attrs.ngEscape);
				});
				event.preventDefault();
			}
		});
	};
})
//=============================
angular.module('app', ['quant-studio'])

.controller('main', function($scope, $locale) {
	//console.log("main init()", $scope);
	
	$scope.date = new Date();
	
	$scope.version = 2;
});
