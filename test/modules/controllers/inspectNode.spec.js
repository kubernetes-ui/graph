'use strict';

describe("Inspect node controller", function() {
  var inspectNodeService = {};
  var scope, location, controller;
  var mockNodeDetail = {'id': 1, 'metadata': 'data'};
  // Work around to get ngLodash correctly injected.
  beforeEach(function () {
    angular.module('testModule',
                   ['ngLodash', 'krakenApp.Graph', 'krakenApp.config']);
  });

  beforeEach(module('testModule'));

  beforeEach(inject(function (
      _inspectNodeService_, $controller, $location, $rootScope) {
    inspectNodeService = _inspectNodeService_;
    // Mock the node detail data returned by the service.
    inspectNodeService.setDetailData(mockNodeDetail);
    scope = $rootScope.$new();
    location = $location;
    controller = $controller('InspectNodeCtrl', {
      $scope: scope,
      $location: location
    });
  }));

  it("should work as intended", function() {
    // Test if the controller sets the correct model values.
    expect(scope.element).toEqual(mockNodeDetail.id);
    expect(scope.metadata).toEqual(mockNodeDetail.metadata);

    // Test if the controller changed the location correctly.
    scope.backToGraph();
    expect(location.path()).toEqual('/graph');
  });
});
