'use strict';

describe("Inspect node service", function() {
  var inspectNodeService;

  beforeEach(module('kubernetesApp.Graph.services'));
  beforeEach(inject(function(_inspectNodeService_) { inspectNodeService = _inspectNodeService_; }));

  it("should set and get data as intended", function() {
    var data = {
      'name': 'pod',
      'id': 1
    };
    inspectNodeService.setDetailData(data);
    var getData = inspectNodeService.getDetailData();
    expect(data).toEqual(getData);
  });
});
