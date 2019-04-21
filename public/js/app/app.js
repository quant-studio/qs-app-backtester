//=============================
angular.module('quant-studio', [])

.directive('appMain', function() {
	var component = function($scope, element, attrs, ctlr, transcludeFn) {
		
		// To make it easier to output HTML
		var output = function(status, details) {
			$('#output').append($('<div>'+status+'</div>'));
			console.log(status, details);
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
});
