function identityTransform(lodash) {
  var random = function() {
    var str = JSON.stringify(Math.random());
    var idx = str.indexOf('.') + 1;
    if (idx > 0 && idx < str.length) {
      str = str.substring(idx);
    }

    return str;
  };

  var nameToIndex = {};
  var typeToGroup = {};
  var mapNode = function(node) {
    var newNode = {};

    var newId = node.id || random();
    var newIndex = nameToIndex[newId];
    if (!newIndex) {
      newIndex = Object.keys(nameToIndex).length;
      nameToIndex[newId] = newIndex;
    }

    newNode.id = newId;
    newNode.name = node.label || newId;

    newNode.group = 0;
    var newType = node.type;
    if (newType) {
      var newGroup = typeToGroup[newType];
      if (!newGroup) {
        newGroup = Object.keys(typeToGroup).length;
        typeToGroup[newType] = newGroup;
      }

      newNode.group = newGroup;
      newNode.type = newType;
    }

    if (node.metadata) {
      newNode.tags = lodash.map(node.metadata, function(value, key) {
        return {
          "key": key,
          "value": value
        };
      });
    }

    if (this.radius) {
      newNode.radius = this.radius;
    }

    return newNode;
  };

  var mapEdge = function(edge) {
    var newEdge = {};

    var sourceName = edge.source;
    var targetName = edge.target;
    if (sourceName && targetName) {
      var sourceIndex = nameToIndex[sourceName];
      var targetIndex = nameToIndex[targetName];
      if (sourceIndex && targetIndex) {
        newEdge.source = sourceIndex;
        newEdge.target = targetIndex;

        newEdge.id = edge.id || random();
        if (edge.relation) {
          newEdge.label = edge.relation;
          newEdge.type = edge.relation;
        }

        if (edge.metadata) {
          newEdge.tags = lodash.map(edge.metadata, function(value, key) {
            return {
              "key": key,
              "value": value
            };
          });
        }

        if (this.thickness) {
          newEdge.thickness = this.thickness;
        }

        if (this.distance) {
          newEdge.distance = this.distance;
        }
      }
    }

    return newEdge;
  };

  var sortNode = function(node) {
    return node.id;
  };

  var sortEdge = function(edge) {
    return edge.source + edge.target;
  };

  var filterNode = function(node) {
    return node.type != this.nodeFilter;
  };

  var filterEdge = function(edge) {
    return edge.source && edge.target 
      && edge.type != this.edgeFilter;
  };

  return function(fromModel, toModel, configuration) {
    if (fromModel && toModel && configuration) {
      nameToIndex = {};
      typeToGroup = {};

      var fromNodes = fromModel.nodes;
      if (fromNodes) {
        toModel.nodes = lodash.chain(fromNodes)
          .map(mapNode, configuration)
          .filter(filterNode, configuration)
          .sortBy(sortNode, configuration)
          .value();
      }

      var fromEdges = fromModel.edges;
      if (fromEdges && Object.keys(nameToIndex).length > 1) {
        toModel.links = lodash.chain(fromEdges)
          .map(mapEdge, configuration)
          .filter(filterEdge, configuration)
          .sortBy(sortEdge, configuration)
          .value();
      }
    }

    return toModel;
  };
};
