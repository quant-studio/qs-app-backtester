
(function(window) {
	
	var sdk = {};
	
	
	// @TODO: Update the executor
	var executor	= {};
	
	executor.zipDatasets	= function(a, b) {
		var values = {};
		_.each(a, function(item) {
			values[new Date(item.d).getTime().toString()] = _.extend({},values[new Date(item.d).getTime().toString()], item);
		});
		_.each(b, function(item) {
			values[new Date(item.d).getTime().toString()] = _.extend({},values[new Date(item.d).getTime().toString()], item);
		});
		var values = _.values(values);
		values.sort(function(a,b) {
			return new Date(a.d).getTime()-new Date(b.d).getTime();
		});
		return values;
	};
	
	executor.executeBox		= function(boxId) {
		if (!$scope.editor.datasources) {
			return false;
		}
		// Find the box
		var box = $scope.editor.data.boxes[boxId];
		if (!box) {
			console.log("Box "+boxId+" not found");
			return false;
		}
		
		// Process a datasource (the root of the data)
		if (box.box=="datasource") {
			// The data is the datasources dataset
			//console.log("This is a datasource");
			
			/*
				- Execute the code
			*/
			
			
			// Make a copy of the dataset
			// At this point, the dataset is saved using the real output keys, not the boxId:portId notation
			$scope.editor.datasets[boxId]	= _.map($scope.editor.datasources[boxId], function(item) {return _.extend({},item);});
			
			// We want to convert the data in the boxId:portId notation
			var replacements = {};
			var spreadsheetExport = {};
			_.each(box.outputs, function(item) {
				replacements[item.id] = item.box+':'+item.id;
				if (item.exportToSpreadsheet) {
					spreadsheetExport[item.id] = item.label;
				}
			});
			
			// Identify the date field
			var date	= _.find(box.schema, function(item) {
				return item.isDate;
			});
			
			if (date) {
				var sharedDatasetIndex = _.indexBy($scope.editor.dataset, function(item) {
					return new Date(item.d).getTime();
				});
				var localDatasetIndex = _.indexBy($scope.editor.datasets[boxId], function(item) {
					return new Date(item[date.prop]).getTime();
				});
				var mergedDataset	= _.extend({}, sharedDatasetIndex, localDatasetIndex);
				$scope.editor.dataset	= _.values(mergedDataset);
				//console.log("mergedDataset["+box.name+"]",mergedDataset);
			}
			
			$scope.editor.datasets[boxId] = _.map($scope.editor.datasets[boxId], function(item) {
				// Make sure the date is "d"
				if (date) {
					item.d = new Date(item[date.prop]);
				}
				_.each(replacements, function(v,k) {
					if (item[k] && k!='d') {
						item[v] = item[k];
						delete item[k];
					}
				});
				return item;
			});
			
			//console.log("[datasource] datasets["+boxId+"]",$scope.editor.datasets[boxId]);
			
		} else {
			// Process a component, which pulls its data from its ancestors
			if (!box.parents || box.parents.length==0) {
				console.log("Orphan box",box);
				// Don't go further, no data to inherit
				box.orphan = true;
				return false;
			}
			box.orphan = false;
			
			
			// Get the data from the parents
			var dataset = [];
			// Zip all the parent datasets together into a single dataset
			_.each(box.parents, function(parent) {
				if (!$scope.editor.datasets[parent]) {
					console.log("Box "+parent+" not found");
					return false;
				}
				//console.log("parent dataset", $scope.editor.datasets[parent]);
				dataset = $scope.editor.zipDatasets(dataset,$scope.editor.datasets[parent]);
				//console.log("new dataset", dataset);
			});
			// Make a deep copy of it, save
			$scope.editor.datasets[boxId] = _.map(dataset, function(item) {return _.extend({},item);});
			
			
			// Execute the logic
			var transformParams = {
				input:	{},
				output:	{},
				outputKeys:	{}
			};
			
			_.each(box.inputs, function(port) {
				if (port.type=='data') {
					if (port.connection && port.connection.length>0) {
						// If it's a plugin, then it can only get one input for each input port
						transformParams.input[port.id] = port.connection[0].box+':'+port.connection[0].id;
					}
					if (!port.connection || !port.connection[0]) {
						console.log("NO CONNECTION", port, box);
						return false;
					}
					if (port.connection.length>0) {
						// Include the input data column in the dataset, so the output can be understood in context
						transformParams.outputKeys[port.connection[0].box+':'+port.connection[0].id] = true;
					}
				} else {
					// Input value here?
					if (port.connection && port.connection.length==1 && /*port.connection[0].box==variableBox.id &&*/ inputs.hasOwnProperty(port.connection[0].id)) {
						transformParams.input[port.id] = inputs[port.connection[0].id];
						//console.log("-----", port.id, inputs[port.connection[0].id]);
					} else {
						transformParams.input[port.id] = port.value;
					}
					//console.log(">> ", port, transformParams.input[port.id]);
					
				}
			});
			_.each(box.outputs, function(port) {
				transformParams.output[port.id] = port.box+':'+port.id;
				transformParams.outputKeys[port.box+':'+port.id] = true;
			});
			
			//console.log("transformParams",transformParams);
			
			var stats = ss;
			var transform = box;
			
			try {
				
				delete box.runtimeError;
				
				try {
					var cb		= eval('(function (data, options, plugins) {'+transform.code+'})');
					$scope.editor.datasets[boxId]	= cb($scope.editor.datasets[boxId], transformParams, {});
					//@TODO: Prevend bad bahaviors, cut access to document, window, cookies, history and everything else that could be accessed
				} catch(e) {
					console.log("e",e);
					box.runtimeError = e.message;
				}
				
			} catch (e) {
				console.log("ERROR",e);
			}
			
			
			
			var sharedDatasetIndex = _.indexBy($scope.editor.dataset, function(item) {
				return new Date(item.d).getTime();
			});
			var localDatasetIndex = _.indexBy($scope.editor.datasets[boxId], function(item) {
				return new Date(item.d).getTime();
			});
			var mergedDataset = $scope.editor.zipDatasets($scope.editor.dataset, $scope.editor.datasets[boxId], box.id=="a6543c4822");
			//var mergedDataset	= _.extend({}, sharedDatasetIndex, localDatasetIndex);
			
			
			$scope.editor.dataset	= _.values(mergedDataset);
		}
		
		return $scope.editor.datasets[boxId];
	}
	
	executor.rebuildData	= function(projectData, inputs, datasource, callback) {
		
		
		$scope.safeApply(function() {
			$scope.editor.loadingDataRebuild	= true;
		});
		
		
		var stack	= new pstack();
		var buffer	= {
			toposort: {}
		};
		
		// Toposort all the boxes relative to each others
		stack.add(function(done) {
			var t = new Toposort();
			
			var outputs = [];
			projectData.boxes = _.mapObject(projectData.boxes, function(box, boxid) {
				box.dependencies	= [];
				box.parents			= [];
				
				_.each(box.inputs, function(port) {
					if (port && port.connection) {
						_.each(port.connection, function(connection) {
							box.dependencies.push(connection.box+':'+connection.id);
							box.parents.push(connection.box);
						});
					}
				});
				box.parents = _.uniq(box.parents);
				
				_.each(box.outputs, function(port) {
					outputs.push({
						output:			port.box+':'+port.id,
						dependencies:	box.dependencies
					});
					t.add(port.box+':'+port.id, box.dependencies);
				});
				
				return box;
			});
			buffer.toposort.order	= t.sort().reverse();
			
			// Extract the boxes
			$scope.editor.data.toposort = [];
			_.each(buffer.toposort.order, function(item) {
				var parts = item.split(':');
				$scope.editor.data.toposort.push(parts[0]);
			});
			$scope.editor.data.toposort = _.uniq($scope.editor.data.toposort);
			
			done();
		});
		
		
		
		// Get the ancestors for each box
		stack.add(function(done) {
			projectData.boxes = _.mapObject(projectData.boxes, function(box, boxid) {
				var ancestors	= _.keys($scope.editor.getBoxAncestors(boxid));
				box.ancestors	= _.filter($scope.editor.data.toposort, function(id) {
					return _.contains(ancestors, id)
				});
				return box;
			});
			done();
		});
		
		// build the data box by box
		stack.add(function(done) {
			_.each($scope.editor.data.toposort, function(boxid) {
				// Build up the data
				$scope.editor.executeBox(boxid)
			});
			done();
		});
		
		
		
		
		stack.start(function() {
			setTimeout(function() {
				$scope.safeApply(function() {
					$scope.editor.loadingDataRebuild	= false;
				});
			}, 500);
			
			$timeout(function() {
				window.Arbiter.inform("chart.refresh");
				window.Arbiter.inform("datasets.refresh");
			});
			
			if (callback) {
				callback($scope.editor.dataset);
			}
		});
		
	},
	
	executor.refreshData	= function(callback) {
		if (!$scope.editor.data) {
			return false;
		}
		
		//console.log("--------------------------------------------------------");
		//console.log("refreshData()", $scope.editor.dataMode);
		
		$scope.safeApply(function() {
			$scope.editor.dataset				= [];
			$scope.editor.loadingDataRefresh	= true;
		});
		
		var stack	= new pstack({
			async:	true	// Load everything at once
		});
		var buffer	= {};
		
		stack.add(function(done) {
			done();	// To make sure the stack is never empty
		});
		
		//console.log("$scope.editor.dataMode",$scope.editor.dataMode);
		
		switch ($scope.editor.dataMode) {
			case "live":
			case "saver":
			
				// Check the rights
				stack.add(function(done) {
					$scope.core.rights.check({
						project:	$scope.editor.data
					}, function(response) {
						//console.log("Rights.check()", response);
						done();
					});
				});
				
				// Find the datasources
				var datasources = _.filter($scope.editor.data.boxes, function(box) {
					return box && box.box=='datasource';
				});
				
				
				// Check if every datasource has data
				var hasData = true;
				_.each(datasources, function(datasource) {
					hasData = hasData && $scope.editor.datasources[datasource.id] && $scope.editor.datasources[datasource.id].length>0;
				});
				
				//console.log("$scope.editor.dataMode",$scope.editor.dataMode);
				//console.log("hasData",hasData);
				if ($scope.editor.dataMode=='live' || ($scope.editor.dataMode=='saver' && !hasData)) {
					//console.log("",);
					_.each(datasources, function(datasource) {
						//console.log("datasource", datasource);
						stack.add(function(done) {
							$scope.core.clientsideDatsource.load(datasource, {}, function(response) {
								//console.log(">>> responseresponse", response);
								//console.log("response",response);
								if (!$scope.editor.datasources) {
									$scope.editor.datasources = {};
								}
								$scope.editor.datasources[datasource.id]	= response.data;
								// Name the graphbox too, with the name generated server-side
								datasource.label	= response.name;
								done();
							});
							/*
							$scope.core.api('/datasource/execute', datasourceOptions, function(response) {
								//console.log("response",response);
								if (!$scope.editor.datasources) {
									$scope.editor.datasources = {};
								}
								$scope.editor.datasources[datasource.id]	= response.data;
								// Name the graphbox too, with the name generated server-side
								datasource.label	= response.name;
								done();
							});
							*/
						});
					});
				} else {
					console.log("Project data paused.");
				}
			break;
			case "cached":
				// Download the cached data
				if (!$scope.editor.datasources) { // Only download if not already downloaded
					stack.add(function(done) {
						$scope.core.api("/datasource/get-public-data", {
							project:	$scope.editor.data.id
						}, function(response) {
							//console.log("Public data found", response);
							if (response && response.dataset && response.dataset===false) {
								// No public dataset found
								// Switch to live mode then
								$scope.editor.dataMode = 'live';
								// Check for any required rights
								$scope.core.rights.check({
									project:	$scope.editor.data
								}, function(response) {
									//console.log("rights.check()",response);
									// Now refresh the data again
									$scope.editor.refreshData(callback);
								});
								return false;
							} else {
								$scope.editor.datasources = response;
								done();
							}
						});
					});
				}
			break;
		}
		
		
		stack.start(function() {
			
			// Rebuild the project
			$scope.editor.rebuildData($scope.editor.data, {}, $scope.editor.datasources, function(response) {
				$scope.safeApply(function() {
					$scope.editor.builtData	= response;
					$scope.editor.loadingDataRefresh	= false;
				});
			});
			
			if (callback) {
				callback();
			}
		});
		
	}
	
	
	
	
	
	sdk = {
		loaded:		false,
		listener:	null,
		data:		{},
		callbacks:	{},
		cleanData:	function(input) {
			if (angular) {
				return JSON.parse(angular.toJson(input));
			} else {
				return JSON.parse(JSON.stringify(input));
			}
		},
		init:	function() {
			if (sdk.listener) {
				window.removeEventListener('message', sdk.listener);
			}
			sdk.listener = window.addEventListener('message', function(e) {
				//console.log("client message",e);
				sdk.handleIncomingMessage(e);
			});
		},
		sid:	function() {
			return Math.random().toString(36).substr(2, 9);
		},
		onInit:	function(callback) {
			if (sdk.loaded) {
				callback();
			} else {
				if (!sdk.callbacks.onInit) {
					sdk.callbacks.onInit = [];
				}
				sdk.callbacks.onInit.push(callback);
			}
		},
		onProjectChange:	function(callback) {
			if (!sdk.callbacks.onProjectChange) {
				sdk.callbacks.onProjectChange = {};
			}
			var id = sdk.sid();
			sdk.callbacks.onProjectChange[id] = callback;
			return {
				id:		id,
				stop:	function() {
					delete sdk.callbacks.onProjectChange[id];
				}
			};
		},
		onDatasetUpdate:	function(callback) {
			if (!sdk.callbacks.onDatasetUpdate) {
				sdk.callbacks.onDatasetUpdate = {};
			}
			var id = sdk.sid();
			sdk.callbacks.onDatasetUpdate[id] = callback;
			return {
				id:		id,
				stop:	function() {
					delete sdk.callbacks.onDatasetUpdate[id];
				}
			};
		},
		onDrag:	function(callback) {
			if (!sdk.callbacks.onDrag) {
				sdk.callbacks.onDrag = {};
			}
			var id = sdk.sid();
			sdk.callbacks.onDrag[id] = callback;
			return {
				id:		id,
				stop:	function() {
					delete sdk.callbacks.onDrag[id];
				}
			};
		},
		checkLoadingStatus:	function() {
			if (sdk.data.project && sdk.data.datasets && sdk.data.app && !sdk.loaded) {
				sdk.loaded	= true;
				if (sdk.callbacks.onInit && sdk.callbacks.onInit.length>0) {
					var execLoop = function(input) {
						var cb = input.pop();
						cb();
						if (input.length>0) {
							execLoop(input);
						}
					}
					execLoop(sdk.callbacks.onInit);
				}
			} else {
				sdk.loaded	= false;
			}
		},
		handleIncomingMessage:	function(event) {
			try {
				var payload = JSON.parse(event.data);
			} catch (e) {
				var payload = event.data;
			}
			
			var rawType		= payload.type;
			var dataPayload	= payload.payload;
			
			var typeParts	= rawType.split(':');
			if (typeParts.length!==2) {
				console.log("Invalid event", payload);
				return false;
			}
			var evtDomain	= typeParts[0];
			var evtType		= typeParts[1];
			
			//console.log(">> ", evtDomain, evtType);
			
			switch (evtDomain) {
				case "data":
					sdk.data[evtType] = dataPayload;
					sdk.checkLoadingStatus();
					if (evtType=='datasets') {
						_.each(sdk.callbacks.onDatasetUpdate, function(cb,k) {
							cb(sdk.data['datasets']);
						});
					}
					if (evtType=='project') {
						_.each(sdk.callbacks.onProjectChange, function(cb,k) {
							cb(sdk.data['project']);
						});
					}
				break;
				case "port-drag":
					_.each(sdk.callbacks.onDrag, function(cb,k) {
						cb(evtType, dataPayload);
					});
				break;
			}
			
			//console.log("Client received:", payload);
		},
		send:	function(type, payload) {
			var parts = type.split(':');
			switch (parts[0]) {
				case "save":
					if (!sdk.data.user_id) {
						console.log("Save not allowed, user not authenticated");
						return false;
					}
				break;
			}
			//console.log("Client Send:", type, payload);
			window.parent.postMessage({
				type:		type,
				payload:	sdk.cleanData(payload)
			}, 'http://localhost:274'/*'https://www.quant-studio.com'*/);
		}
	}
	
	sdk.init();
	
	window.sdk = sdk;
	
})(window)