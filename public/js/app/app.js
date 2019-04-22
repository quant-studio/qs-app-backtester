//=============================
angular.module('quant-studio', ['ui.ace'])

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
						case "stats":
						case "charts":
							if ($scope.backtester.results) {
								$scope.tabs.selected	= id;
							}
						break;
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
			settings: {
				datasource: {
					type:		'csv',
					csvSource:	'http://localhost:8080/data/AAPL.csv'
				},
				positions: {
					code:	''
				}
			},
			datasource: {
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
			}
		}
		
		
		
		
		
		
		
		// 
		sdk.onInit(function() {
			output("App started");
		});
		
		// 
		sdk.onDatasetUpdate(function(datasets) {
			output("Datasets update received", datasets);
		});
		
		// 
		sdk.onProjectChange(function(datasets) {
			output("Project update received", datasets);
		});
		
		// Port drag & drop
		sdk.onDrag(function(eventType, data) {
			switch (eventType) {
				case "start":
					output("[drag] Started -> "+data.data.box+':'+data.data.id, data);
				break;
				case "move":
					if (data.end.left > 0 && data.end.top > 0) {
						output("[drag] Hover ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
					} else {
						//output("[drag] Moving ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
					}
				break;
				case "end":
					if (data.end.left > 0 && data.end.top > 0) {
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
						output("Data output from that port: <code>... "+_.pluck(filtered.slice(-5), data.data.label).join(' / ')+"</code>");
					} else {
						output("[drag] Ended outside the app -> "+data.data.box+':'+data.data.id, data);
					}
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

//=============================
angular.module('app', ['quant-studio'])

.controller('main', function($scope, $locale) {
	//output("main init()", $scope);
	
	$scope.date = new Date();
	
	$scope.version = 2;
});
