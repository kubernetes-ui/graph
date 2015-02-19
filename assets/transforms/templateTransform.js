function templateTransform(lodash, template) {
  var nameToIndex = {};
  var typeToGroup = {};

  var random = function() {
    var str = JSON.stringify(Math.random());
    var idx = str.indexOf('.') + 1;
    if (idx > 0 && idx < str.length) {
      str = str.substring(idx);
    }

    return str;
  };

  var allTags = function(fromItem, toItem) {
    if (!toItem.tags && fromItem.metadata) {
      toItem.tags = lodash.map(fromItem.metadata, function(value, key) {
        return { "key": key, "value": value };
      });
    }
  };

  var mapItem = function(fromItem, toItem, maps, apply) {
    if (maps) {
      var map = lodash.find(maps, function(map) {
        return apply(fromItem, map.scope);
      });

      if (map) {
        var properties = map.properties;
        if (properties) {
          // TODO: Make the property list dynamic.
          if (properties.name) {
            var result = JSONPath(null, fromItem, properties.name);
            if (result && result.length > 0) {
              toItem.name = result[0];
            }
          }

          if (properties.label) {
            var result = JSONPath(null, fromItem, properties.label);
            if (result && result.length > 0) {
              toItem.label = result[0];
            }
          }

          if (properties.type) {
            var result = JSONPath(null, fromItem, properties.type);
            if (result && result.length > 0) {
              toItem.type = result[0];
            }
          }

          if (properties.tags) {
            toItem.tags = [];
            lodash.forOwn(properties.tags, function(path, label) {
              var result = JSONPath(null, fromItem, path);
              if (result && result.length > 0) {
                toItem.tags.push({ 'key': label, 'value': result[0] });
              }
            });
          }
        }
      }
    }

    allTags(fromItem, toItem);
  };

  var setIndex = function(toNode) {
    if (!nameToIndex[toNode.id]) {
      nameToIndex[toNode.id] = Object.keys(nameToIndex).length;
    }
  };

  var getIndex = function(fromEdge, toEdge) {
    if (fromEdge.source && fromEdge.target) {
      toEdge.source = nameToIndex[fromEdge.source];
      toEdge.target = nameToIndex[fromEdge.target];
    }
  };

  var setGroup = function(toNode) {
    toNode.group = 0;
    if (toNode.type) {
      toNode.group = typeToGroup[toNode.type];
      if (!toNode.group) {
        toNode.group = Object.keys(typeToGroup).length;
        typeToGroup[toNode.type] = toNode.group;
      }
    }
  };

  var mapNode = function(fromNode) {
    var toNode = {};

    toNode.id = fromNode.id || random();
    toNode.name = fromNode.label || toNode.id;
    toNode.type = fromNode.type;

    mapItem(fromNode, toNode, template.nodeMaps,
        function(fromNode, scope) { return scope.test(fromNode.type); });

    setIndex(toNode);
    setGroup(toNode);

    if (this.radius) {
      toNode.radius = this.radius;
    }

    return toNode;
  };

  var mapEdge = function(fromEdge) {
    var toEdge = {};

    toEdge.id = fromEdge.id || random();
    toEdge.label = toEdge.name || fromEdge.relation;
    toEdge.type = fromEdge.relation;

    mapItem(fromEdge, toEdge, template.edgeMaps,
        function(fromEdge, scope) { return scope.test(fromEdge.relation); });

    getIndex(fromEdge, toEdge);

    if (this.thickness) {
      toEdge.thickness = this.thickness;
    }

    if (this.distance) {
      toEdge.distance = this.distance;
    }

    return toEdge;
  };

  var sortNode = function(fromNode) {
    return fromNode.id;
  };

  var sortEdge = function(fromEdge) {
    return fromEdge.source + fromEdge.target;
  };

  var filterItem = function(filters) {
    return function(fromItem) {
      return lodash.every(filters, function(filter) {
        var args = [];
        if (filter.args) {
          lodash.forEach(filter.args, function(arg) {
            var results = JSONPath(null, fromItem, arg);
            if (results && results.length > 0) {
              results = lodash.map(results, function(result) {
                if (typeof result === 'undefined') {
                  return 'undefined';
                }

                return result;
              });
              args.push(results);
            }
          });
        }

        var expr = vsprintf(filter.expr, args);
        return eval(expr);
      });
    };
  };

  return function(fromModel, toModel, configuration) {
    if (fromModel && toModel && configuration) {
      nameToIndex = {};
      typeToGroup = {};

      if (fromModel.nodes) {
        var chain = lodash.chain(fromModel.nodes);
        if (template.nodeFilters) {
          chain = chain.filter(filterItem(template.nodeFilters), configuration);
        }

        toModel.nodes = chain
            .map(mapNode, configuration)
            .sortBy(sortNode, configuration)
            .value();
      }

      if (fromModel.edges) {
        var chain = lodash.chain(fromModel.edges);
        if (template.edgeFilters) {
          chain = chain.filter(filterItem(template.edgeFilters), configuration);
        }

        // Remove links to dropped nodes.
        var linkFilters = [{
          "expr" : "('%s' !== 'undefined') && ('%s' !== 'undefined')",
          "args" : [ "$.source", "$.target" ]
        }];

        toModel.links = chain
            .map(mapEdge, configuration)
            .filter(filterItem(linkFilters), configuration)
            .sortBy(sortEdge, configuration)
            .value();
      }
    }

    return toModel;
  };
}