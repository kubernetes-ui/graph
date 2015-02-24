function templateTransform(lodash, template) {
  var nodeLegend = undefined;
  var linkLegend = undefined;
  if (template.legend) {
    if (template.legend.nodes) {
      nodeLegend = template.legend.nodes;
    }

    if (template.legend.links) {
      linkLegend = template.legend.links;
    }
  }

  var stringifyNoQuotes = function(result) {
    if (typeof result !== "string") {
      if (typeof result !== "undefined") {
        result = JSON.stringify(result);
        result = result.replace(/\"([^(\")"]+)\":/g,"$1:");
      } else {
        result = "undefined";   
      }
    }

    return result;
  };

  var evalExpression = function(item, expression) {
    var result = undefined;
    if (typeof expression.eval === "string") {
      var args = [];
      if (lodash.isArray(expression.args)) {
        lodash.forEach(expression.args, function(results) {
          if (typeof results === "string") {
            if (results.charAt(0) == "$") {
              results = JSONPath(null, item, results);
            }
            if (results && results.length > 0) {
              results = lodash.map(results, function(result) {
                return stringifyNoQuotes(result);
              });
              args.push(results);
            }
          }
        });
        var expr = vsprintf(expression.eval, args);
      }
      result = eval(expr);
    }

    return result;
  };

  var filterItem = function(filters) {
    return function(fromItem) {
      return lodash.every(filters, function(filter) { 
        return evalExpression(fromItem, filter); 
      });
    };
  };

  var random = function() {
    var str = JSON.stringify(Math.random());
    var idx = str.indexOf(".") + 1;
    if (idx > 0 && idx < str.length) {
      str = str.substring(idx);
    }

    return str;
  };

  var evalMapping = function(item, mapping) {
    var result = undefined;
    if (mapping) {
      if (typeof mapping === "string") {
        result = mapping;
        if (result.charAt(0) == "$") {
          result = JSONPath(null, item, mapping);
          if (result && result.length == 1) {
            result = result[0];
          }
        }
      } else
      if (typeof mapping === "object") {
        if (mapping.expression) {
        result = evalExpression(item, mapping);
        } else
        if (mapping.properties) {
          result = mapProperties(item, {}, mapping);
        }
      } else
      if (lodash.isArray(mapping)) {
        result = lodash.map(mapping, function(member) {
            return evalMapping(item, member);
        });
      }
    }

    return result;
  };

  var mapProperties = function(fromItem, toItem, properties) {
    if (properties) {
      lodash.forOwn(properties, function(mapping, property) {
        mapping = evalMapping(fromItem, mapping);
        if (mapping) {
          property = evalMapping(fromItem, property);
          if (property) {
            property = stringifyNoQuotes(property);
            toItem[property] = mapping;
          }
        }
      });
    }
  };

  var mapItem = function(fromItem, toItem, maps, legend) {
    toItem.id = fromItem.id || random();

    if (maps) {
      // TODO: Apply maps progressively not sequentially.
      lodash.forEach(maps, function(map) {
        if (!map.filter || evalExpression(fromItem, map.filter)) {
          mapProperties(fromItem, toItem, map.properties);
        }
      });
    }
  };

  var mapNode = function(fromNode) {
    var toNode = {};
    mapItem(fromNode, toNode, template.nodeMaps, nodeLegend || this.legend.nodes);
    return toNode;
  };

  var mapEdge = function(fromEdge) {
    var toEdge = {};
    mapItem(fromEdge, toEdge, template.edgeMaps, linkLegend || this.legend.links);
    return toEdge;
  };

  var sortNode = function(fromNode) {
    return fromNode.id;
  };

  var sortEdge = function(fromEdge) {
    return fromEdge.source + ":" + fromEdge.target;
  };

  var mapNodes = function(fromModel, toModel, configuration) {
    var chain = lodash.chain(fromModel.nodes);
    if (template.nodeFilters) {
      chain = chain
        .filter(filterItem(template.nodeFilters), configuration);
    }

    toModel.nodes = chain
      .sortBy(sortNode, configuration)
      .map(mapNode, configuration)
      .value();
  };

  var mapEdges = function(fromModel, toModel, configuration) {
    var chain = lodash.chain(fromModel.edges);
    if (template.edgeFilters) {
      chain = chain.filter(filterItem(template.edgeFilters), configuration);
    }

    toModel.links = chain
      .map(mapEdge, configuration)
      .sortBy(sortEdge, configuration)
      .value();
  };

  return function(fromModel, toModel, configuration) {
    if (fromModel && toModel && configuration) {
      if (template.settings) {
        toModel.settings = template.settings;
      }

      if (fromModel.nodes) {
        mapNodes(fromModel, toModel, configuration);
        if (fromModel.edges) {
          mapEdges(fromModel, toModel, configuration);
        }
      }
    }

    return toModel;
  };
}