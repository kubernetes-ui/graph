'use strict';

describe('D3 directive', function() {
  var $compile;
  var $rootScope;
  var viewModelService;

  // Work around to get ngLodash correctly injected.
  beforeEach(function() {
    angular.module('testModule', ['ngLodash', 'kubernetesApp.Graph']);
  });

  beforeEach(module('testModule'));

  beforeEach(inject(function(_$compile_, _$rootScope_, _viewModelService_){
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    viewModelService = _viewModelService_;
  }));

  it('should replace the element with the appropriate svg content', function() {
    // Compile some HTML containing the directive.
    var element = $compile('<div><d3-visualization></d3-visualization></div>')($rootScope);

    $rootScope.viewModelService = viewModelService;

    // Test that the element hasn't been compiled yet.
    expect(element.html()).toEqual('<d3-visualization></d3-visualization>');

    // Request the viewModelService to update the view model with the specified data.
    viewModelService.setViewModel(MOCK_SAMPLE_DATA[0].data);

    // Test that the element still hasn't been compiled yet.
    expect(element.html()).toEqual('<d3-visualization></d3-visualization>');

    // Fire all the watches.
    $rootScope.$digest();

    // Test that the element has been compiled and contains the svg content.
    expect(element.html()).toContain('<svg');
    expect(element.html()).toContain('service: guestbook');
    expect(element.html()).toContain('pod: guestbook-controller');
  });

  it('blah, blah, should replace the element with the appropriate svg content', function() {
    // Compile some HTML containing the directive.
    var element = $compile('<div><d3-visualization></d3-visualization></div>')($rootScope);

    $rootScope.viewModelService = viewModelService;

    // Request the viewModelService to update the view model with the specified data. No initial selections.
    viewModelService.setViewModel(MOCK_SAMPLE_DATA[0].data);

    // Fire all the watches.
    $rootScope.$digest();

    // Test that at least one node has an opacity of 1.
    expect(element.html()).toContain('<g class="node" style="opacity: 1');
    // Test that no nodes have an opacity of less than 1.
    expect(element.html()).not.toContain('<g class="node" style="opacity: 0.');

    // Set a new selection id list that should trigger a watch.
    $rootScope.selectionIdList = [2];

    // Fire all the watches.
    $rootScope.$digest();

    // Test that at least one node has an opacity of 1.
    expect(element.html()).toContain('<g class="node" style="opacity: 1');
    // Test that at least one node has an opacity of less than 1.
    expect(element.html()).toContain('<g class="node" style="opacity: 0.');
  });

  var MOCK_SAMPLE_DATA = [
    {
      'name' : 'All Types',
      'data' : {
        'nodes': [
          {
            'name': 'service: guestbook',
            'radius': 16,
            'fill': 'olivedrab',
            'id': 5
          },
          {
            'name': 'pod: guestbook-controller',
            'radius': 20,
            'fill': 'palegoldenrod',
            'id': 2
          },
        ],
        'links': [],
        'configuration': {
          'settings': {
            'clustered': false,
            'showEdgeLabels': true,
            'showNodeLabels': true
          }
        }
      }
    }
  ];
});
