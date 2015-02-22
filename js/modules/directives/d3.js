// TODO(duftler): Remove mockDataService dependency once 'Samples' section is removed from canvas context menu.
angular.module('krakenApp.Graph')
    .directive('d3Visualization', ['lodash', 'd3Service', 'mockDataService', '$location',
                                   'inspectNodeService',
                                   function (lodash, d3Service, mockDataService, $location, inspectNodeService) {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch("viewModelService.viewModel.version", function(newValue, oldValue) {
        d3Service.d3().then(draw);
      });

      var viewSettingsCache = {};
      var nodeSettingsCache = {};

      var draw = function() {
        var d3 = window.d3;
        d3.select(window).on('resize', resize);

        var containerDimensions = getContainerDimensions();

        // TODO(duftler): Derive the svg height from the container rather than the other way around.
        var width = containerDimensions[0] - 16;
          height = 700,
          center = [width / 2, height / 2];

        var color = d3.scale.category20();

        d3.select(element[0]).select("svg").remove();

        var svg = d3.select(element[0])
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("class", "graph");

        svg.append("defs").selectAll("marker")
          .data(["suit", "licensing", "resolved"])
          .enter().append("marker")
          .attr("id", function(d) { return d; })
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 60)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .attr("markerUnits", "userSpaceOnUse")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5 L10,0 L0, -5")
          .style("stroke", "black")
          .style("opacity", "1");

        svg.on('contextmenu', function (data, index) {
          d3.selectAll('.popup-tags-table').style("display", "none");

          if (d3.select('.d3-context-menu').style('display') !== 'block') {
            showContextMenu(data, index, canvasContextMenu);
          }
        });

        var zoom = d3.behavior.zoom()
            .scaleExtent([0.5, 12])
            .on("zoom", zoomed);

        if (viewSettingsCache.translate && viewSettingsCache.scale) {
          zoom.translate(viewSettingsCache.translate).scale(viewSettingsCache.scale);
        }

        var g = svg.append("g");

        svg.call(zoom).on("dblclick.zoom", null).call(zoom.event);

        var origWheelZoomHandler = svg.on("wheel.zoom");
        svg.on("wheel.zoom", wheelScrollHandler);

        d3.select("body")
          .on("keydown", function() {
            if (d3.event.ctrlKey) {
              svg.on("wheel.zoom", origWheelZoomHandler);
            }
          })
          .on("keyup", function() {
            if (!d3.event.ctrlKey) {
              svg.on("wheel.zoom", wheelScrollHandler);
            }
          });

        var drag = d3.behavior.drag()
          .origin(function(d) { return d; })
          .on("dragstart", dragstarted)
          .on("drag", dragmove)
          .on("dragend", dragended);

        var graph = undefined;
        if (scope.viewModelService) {
          graph = scope.viewModelService.viewModel.data;
        }

        if (graph === undefined) return;

        var force = d3.layout.force()
          .size([width, height])
          .on("tick", tick);

        if (graph.settings.clustered) {
          // TODO(duftler): Externalize these values.
          force.gravity(.02)
            .charge(0);
        } else {
          // TODO(duftler): Externalize these values.
          force.gravity(.40)
            .charge(-1250)
            .linkDistance(function (d) {
              return d.distance;
            }).links(graph.links)

          // Create all the line svgs but without locations yet.
          var link = g.selectAll(".link")
            .data(graph.links)
            .enter().append("line")
            .attr("class", "link")
            .style("marker-end", function (d) {
              if (d.directed) {
                return "url(#suit)";
              } else {
                return "none";
              }
            })
            .style("stroke", function (d) {
              return d.stroke;
            })
            .style("stroke-dasharray", function (d) {
              return d.dash ? (d.dash + ", " + d.dash) : ("1, 0");
            })
            .style("stroke-width", function (d) {
              return d.width;
            });
        }

        var newPositionCount = 0;

        graph.nodes.forEach(function (n) {
          var cachedSettings;

          if (n.id) {
            cachedSettings = nodeSettingsCache[n.id];
          }

          if (n.fixed) {
            n.fixed = 8;
          } else if (cachedSettings && cachedSettings.fixed) {
            n.fixed = 8;
          }

          if (n.position) {
            n.x = n.position[0];
            n.y = n.position[1];

            ++newPositionCount;
          } else if (cachedSettings) {
            var cachedPosition = cachedSettings.position;

            if (cachedPosition) {
              n.x = cachedPosition[0];
              n.y = cachedPosition[1];
            }
          }

          if (!n.x && !n.y) {
            var radius = graph.nodes.length * 3;
            var startingPosition = getRandomStartingPosition(radius);

            n.x = center[0] + startingPosition[0];
            n.y = center[1] + startingPosition[1];

            ++newPositionCount;
          }
        });

        force.nodes(graph.nodes);

        // TODO(duftler): Remove this after we investigate why so many new id's are returned on 'Refresh'.
        console.log("graph.nodes.length=" + graph.nodes.length + " newPositionCount=" + newPositionCount);

        if (newPositionCount < (0.25 * graph.nodes.length)) {
          force.start().alpha(0.01);
        } else {
          force.start();
        }

        var maxRadius = -1;

        function buildClusters(nodes) {
          var maxCluster = -1;

          nodes.forEach(function (d) {
            maxCluster = Math.max(maxCluster, d.cluster);
            maxRadius = Math.max(maxRadius, d.radius);
          });

          var clusters = new Array(maxCluster + 1);

          nodes.forEach(function (d) {
            if (!clusters[d.cluster] || (d.radius > clusters[d.cluster].radius)) clusters[d.cluster] = d;
          });

          return clusters;
        }

        // The largest node for each cluster.
        var clusters;

        if (graph.settings.clustered) {
          clusters = buildClusters(graph.nodes);
        }

        var node = g.selectAll(".node")
          .data(graph.nodes)
          .enter().append("g")
          .attr("class", "node")
          .on("mouseover", d3_layout_forceMouseover)
          .on("mouseout", d3_layout_forceMouseout)
          .call(drag);

        // create the div element that will hold the context menu
        d3.selectAll('.d3-context-menu').data([1])
            .enter()
            .append('div')
            .attr('class', 'd3-context-menu');

        // close menu
        d3.select('body').on('click.d3-context-menu', function() {
          d3.select('.d3-context-menu').style('display', 'none');
        });

        d3.selectAll('.popup-tags-table').data([1])
          .enter()
          .append('div')
          .attr('class', 'popup-tags-table')
          .style('display', 'none');

        d3.select('body').on('click.popup-tags-table', function() {
          d3.selectAll('.popup-tags-table').style('display', 'none');
        });

        node.each(function (n) {
          var singleNode = d3.select(this);

          if (n.icon) {
            singleNode.append("image")
              .attr("xlink:href", function (d) {
                return d.icon;
              })
              .attr("width", function (d) {
                return d.size[0];
              })
              .attr("height", function (d) {
                return d.size[1];
              })
              .on("dblclick", dblclick)
              .on('contextmenu', function (data, index) {
                d3.selectAll('.popup-tags-table').style("display", "none");
                showContextMenu(data, index, nodeContextMenu);
              })
              .on("mouseover", showPopupTagsTable)
              .on("mouseout", function () {
                // Interrupt any pending transition on this node.
                d3.selectAll('.popup-tags-table').transition();
              });
          } else {
            singleNode.append("circle")
              .attr("r", function (d) {
                return d.radius;
              })
              .style("stroke", function (d) {
                return d.stroke;
              })
              .style("fill", function (d) {
                return d.fill;
              })
              .on("dblclick", dblclick)
              .on('contextmenu', function (data, index) {
                d3.selectAll('.popup-tags-table').style("display", "none");
                showContextMenu(data, index, nodeContextMenu);
              })
              .on("mouseover", showPopupTagsTable)
              .on("mouseout", function () {
                // Interrupt any pending transition on this node.
                d3.selectAll('.popup-tags-table').transition();
              });
          }
        });

        if (graph.settings.showNodeLabels) {
          node.append("text")
            .attr("dx", 10)
            .attr("dy", ".35em")
            .text(function (d) {
              return !d.hideLabel ? d.name : ""
            });
        }

        if (!graph.settings.clustered && graph.settings.showEdgeLabels) {
          var edgepaths = g.selectAll(".edgepath")
            .data(graph.links)
            .enter()
            .append('path')
            .attr({
              'd': function (d) {
                return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y
              },
              'class': 'edgepath',
              'fill-opacity': 0,
              'stroke-opacity': 0,
              'fill': 'blue',
              'stroke': 'red',
              'id': function (d, i) {
                return 'edgepath' + i
              }
            })
            .style("pointer-events", "none");

          var edgelabels = g.selectAll(".edgelabel")
            .data(graph.links)
            .enter()
            .append('text')
            .style("pointer-events", "none")
            .attr({
              'class': 'edgelabel',
              'id': function (d, i) {
                return 'edgelabel' + i
              },
              'dx': function (d) {
                return d.distance / 3
              },
              'dy': 0
            });

          edgelabels.append('textPath')
            .attr('xlink:href', function (d, i) {
              return '#edgepath' + i
            })
            .style("pointer-events", "none")
            .text(function (d, i) {
              return d.label
            });
        }

        var circle = g.selectAll("circle");

        if (graph.settings.clustered && newPositionCount) {
          circle.transition()
            .duration(750)
            .delay(function (d, i) {
              return i * 5;
            })
            .attrTween("r", function (d) {
              var i = d3.interpolate(0, d.radius);
              return function (t) {
                return d.radius = i(t);
              };
            });
        }

        function dblclick(d) {
          // TODO(duftler): This is just a place-holder for now.
          console.log("Double-clicked: d=" + JSON.stringify(d));
        }

        function showContextMenu(data, index, contextMenu) {
          var elm = this;

          d3.selectAll('.d3-context-menu').html('');
          var list = d3.selectAll('.d3-context-menu').append('ul');
          list.selectAll('li').data(contextMenu).enter()
              .append('li')
              .html(function (d) {
                return (typeof d.title === 'string') ? d.title : d.title(data);
              })
              .on('click', function (d, i) {
                d.action(elm, data, index);
                d3.select('.d3-context-menu').style('display', 'none');
              });

          // display context menu
          d3.select('.d3-context-menu')
              .style('left', (d3.event.pageX - 2) + 'px')
              .style('top', (d3.event.pageY - 2) + 'px')
              .style('display', 'block');

          d3.event.preventDefault();
        }

        function showPopupTagsTable(n) {
          // Only start the popup transition if the context-menu is not displayed, the node is not being dragged, and
          // the popup is not already displayed.
          if (d3.select('.d3-context-menu').style('display') !== 'block'
              && !n.dragging
              && d3.select('.popup-tags-table').style('display') !== 'block') {
            d3.selectAll('.popup-tags-table').html('');

            if (n.tags && Object.keys(n.tags)) {
              var mdItem = d3
                .selectAll('.popup-tags-table')
                .append("md-content")
                .append("md-list")
                .selectAll("md-item")
                .data(Object.keys(n.tags))
                .enter()
                .append("md-item");

              var div = mdItem
                .append("md-item-content")
                .append("div");

              div.append("h4")
                .text(function (d) {
                  return d;
                });

              div
                .append("a")
                .attr("class", function (d) {
                  if (d !== null
                      && (typeof n.tags[d] === 'object' || n.tags[d].toString().indexOf("http://") === 0)) {
                    return "";
                  } else {
                    return "not-a-link";
                  }
                })
                .attr("href", function (d) {
                  if (d !== null && typeof n.tags[d] === 'object') {
                    // TODO(duftler): Update this to reflect new route/pattern defined by Xin.
                    return "/graph/inspect.html?key=" + d;
                  } else if (d != null && n.tags[d].toString().indexOf("http://") === 0) {
                    return n.tags[d];
                  } else {
                    return "";
                  }
                })
                .append("p")
                .text(function (d) {
                  if (d !== null && typeof n.tags[d] === 'object') {
                    return "Inspect...";
                  } else {
                    return n.tags[d];
                  }
                });

              var i = 0;
              for (i = 0; i < mdItem.size() - 1; ++i) {
                d3.select(mdItem[0][i]).append("md-divider");
              }

              d3.selectAll('.popup-tags-table')
                .style('left', (d3.event.pageX - 2) + 'px')
                .style('top', (d3.event.pageY - 2) + 'px');

              d3.selectAll('.popup-tags-table')
                .transition()
                .delay(1500)
                .style('display', 'block');
            }
          }
        }

        // Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements.
        function tick(e) {
          if (graph.settings.clustered) {
            circle.each(function (d) {
              if (this.parentNode.childNodes.length == 2 && this.parentNode.lastChild.localName == 'text') {
                var siblingText = this.parentNode.lastChild;

                siblingText.setAttribute("x", d.x);
                siblingText.setAttribute("y", d.y);
              }
            });

            circle
              .each(cluster(10 * e.alpha * e.alpha))
              .each(collide(.5))
              .attr("cx", function (d) {
                return d.x;
              })
              .attr("cy", function (d) {
                return d.y;
              });
          } else {
            link
              .attr("x1", function (d) {
                var offsetX = d.source.icon ? d.source.size[0] / 2 : 0;

                return d.source.x + offsetX;
              })
              .attr("y1", function (d) {
                var offsetY = d.source.icon ? d.source.size[1] / 2 : 0;

                return d.source.y + offsetY;
              })
              .attr("x2", function (d) {
                var offsetX = d.target.icon ? d.target.size[0] / 2 : 0;

                return d.target.x + offsetX;
              })
              .attr("y2", function (d) {
                var offsetY = d.target.icon ? d.target.size[1] / 2 : 0;

                return d.target.y + offsetY;
              });

            g.selectAll("circle")
              .attr("cx", function (d) {
                return d.x;
              })
              .attr("cy", function (d) {
                return d.y;
              });

            if (force.alpha() < 0.04) {
              graph.nodes.forEach(function (n) {
                if (n.id) {
                  if (!nodeSettingsCache[n.id]) {
                    nodeSettingsCache[n.id] = {};
                  }

                  nodeSettingsCache[n.id].position = [n.x, n.y];
                }
              });
            }

            d3.selectAll("image")
              .attr("x", function (d) {
                return d.x;
              })
              .attr("y", function (d) {
                return d.y;
              });

            d3.selectAll("text")
              .attr("x", function (d) {
                return d.x;
              })
              .attr("y", function (d) {
                return d.y;
              });

            if (edgepaths) {
              edgepaths.attr('d', function (d) {
                var path = 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
                return path
              });

              edgelabels.attr('transform', function (d, i) {
                if (d.target.x < d.source.x) {
                  bbox = this.getBBox();
                  rx = bbox.x + bbox.width / 2;
                  ry = bbox.y + bbox.height / 2;
                  return 'rotate(180 ' + rx + ' ' + ry + ')';
                }
                else {
                  return 'rotate(0)';
                }
              });
            }
          }
        }

        // Move d to be adjacent to the cluster node.
        function cluster(alpha) {
          return function (d) {
            var cluster = clusters[d.cluster];
            if (cluster === d) return;
            if (d.x == cluster.x && d.y == cluster.y) {
              d.x += 0.1;
            }
            var x = d.x - cluster.x,
              y = d.y - cluster.y,
              l = Math.sqrt(x * x + y * y),
              r = d.radius + cluster.radius;
            if (l != r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              cluster.x += x;
              cluster.y += y;
            }
          };
        }

        // Resolves collisions between d and all other circles.
        function collide(alpha) {
          var quadtree = d3.geom.quadtree(graph.nodes);
          return function (d) {
            var r = d.radius + maxRadius + Math.max(graph.settings.clusterSettings.padding, graph.settings.clusterSettings.clusterPadding),
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                  y = d.y - quad.point.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? graph.settings.clusterSettings.padding : graph.settings.clusterSettings.clusterPadding);
                if (l < r) {
                  l = (l - r) / l * alpha;
                  d.x -= x *= l;
                  d.y -= y *= l;
                  quad.point.x += x;
                  quad.point.y += y;
                }
              }
              return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
          };
        }

        var canvasContextMenu = [
          {
            title: 'Reset Zoom/Pan',
            action: function (elm, d, i) {
              adjustZoom();
            }
          }
        ];

        var nodeContextMenu = [
          {
            title: function(d) {
              return d.fixed & 8 ? "Unlock" : "Lock";
            },
            action: function(elm, d, i) {
              if (!nodeSettingsCache[d.id]) {
                nodeSettingsCache[d.id] = {};
              }

              if (d.fixed) {
                d.fixed &= ~8;
                force.resume();

                nodeSettingsCache[d.id].fixed = false;
              } else {
                d.fixed |= 8;

                nodeSettingsCache[d.id].fixed = true;
              }
            }
          }, {
	    title: function(d) {
              return "Inspect Node";
            },
            action: function(elm, d, i) {
              // Add the node details into the service, to be consumed by the
              // next controller.
              inspectNodeService.setDetailData(d);

              // Redirect to the detail view page.
              $location.path('/graph/inspect');
              scope.$apply();
            }
	  }
        ];

        function wheelScrollHandler() {
          var origTranslate = zoom.translate();

          zoom.translate([origTranslate[0] - window.event.deltaX, origTranslate[1] - window.event.deltaY]);
          zoomed();
        }

        function zoomed() {
          var translate = zoom.translate();
          var scale = zoom.scale();

          g.attr("transform", "translate(" + translate + ")scale(" + scale + ")");

          viewSettingsCache.translate = translate;
          viewSettingsCache.scale = scale;
        }

        function dragstarted(d) {
          d3.event.sourceEvent.stopPropagation();

          // Interrupt any pending transition on this node.
          d3.selectAll('.popup-tags-table').transition();

          d.fixed |= 2;
          d.dragging = true;
        }

        function dragmove(d) {
          d.px = d3.event.x, d.py = d3.event.y;
          force.resume();
        }

        function dragended(d) {
          d.fixed &= ~6;
          d.dragging = false;
        }

        function d3_layout_forceMouseover(d) {
          d.fixed |= 4;
          d.px = d.x, d.py = d.y;
        }

        function d3_layout_forceMouseout(d) {
          d.fixed &= ~4;
        }

        function adjustZoom(factor) {
          var scale = zoom.scale(),
              extent = zoom.scaleExtent(),
              translate = zoom.translate(),
              x = translate[0], y = translate[1],
              target_scale = scale * factor;

          var reset = !factor;

          if (reset) {
            target_scale = 1;
            factor = target_scale / scale;
          }

          // If we're already at an extent, done
          if (target_scale === extent[0] || target_scale === extent[1]) { return false; }
          // If the factor is too much, scale it down to reach the extent exactly
          var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
          if (clamped_target_scale != target_scale){
            target_scale = clamped_target_scale;
            factor = target_scale / scale;
          }

          // Center each vector, stretch, then put back
          x = (x - center[0]) * factor + center[0];
          y = (y - center[1]) * factor + center[1];

          if (reset) {
            x = 0;
            y = 0;
          }

          // Transition to the new view over 350ms
          d3.transition().duration(350).tween("zoom", function () {
            var interpolate_scale = d3.interpolate(scale, target_scale),
                interpolate_trans = d3.interpolate(translate, [x,y]);
            return function (t) {
              zoom.scale(interpolate_scale(t))
                  .translate(interpolate_trans(t));
              zoomed();
            };
          });
        }

        function getContainerDimensions() {
          var parentNode = d3.select(element[0].parentNode);
          var width = parseInt(parentNode.style("width"));
          var height = parseInt(parentNode.style("height"));

          return [width, height];
        }

        function resize() {
          var containerDimensions = getContainerDimensions();
          var width = containerDimensions[0] - 16;
          var height = containerDimensions[1] - 19;
          var svg = d3.select(element[0]).select("svg");

          svg.attr('width', width);
          svg.attr('height', height);

          force.size([width, height]).resume();
        }

        function getRandomStartingPosition(radius) {
          var t = 2 * Math.PI * Math.random();
          var u = Math.random() + Math.random();
          var r = u > 1 ? 2 - u : u;

          return [r * Math.cos(t) * radius, r * Math.sin(t) * radius];
        }
      };
    }
  };
}]);
