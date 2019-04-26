//=============================
angular.module('quant-studio-ui', ['ui.ace'])

.directive('uiInput', function() {
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
		
		$scope.ui = {
			value:	'',
			init:	function() {
				
			},
			getLabel:	function(value) {
				if ($scope.uiInput && $scope.uiInput.type=='list') {
					line = _.find($scope.uiInput.list, function(item) {
						return item.value == $scope.value;
					});
					if (line) {
						return line.label;
					}
				}
				return value;
			},
			done:	function() {
				//console.log("done()");
				$scope.safeApply(function() {
					$scope.value	= JSON.parse(angular.toJson($scope.ui.value));
					$scope.ui.edit	= false;
				});
			}
		}
		
		$scope.$watch('value', function() {
			if ($scope.value && $scope.value!=$scope.ui.value) {
				$scope.ui.value = JSON.parse(angular.toJson($scope.value));
			}
		});
		
		$scope.$watch('uiInput', function() {
			if ($scope.uiInput) {
				$scope.ui.init();
			}
		})
	};
	return {
		link: 			component,
		scope:			{
			uiInput:	'=',
			value:		'='
		},
		templateUrl:	'/js/quant-studio-ui/ui-input.html'
	};
})