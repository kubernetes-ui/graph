// TODO(duftler): Remove mockDataService dependency once 'Samples' section is removed from canvas context menu.
angular.module('krakenApp.Graph')
.directive('d3Visualization', ['lodash', 'd3Service', 'mockDataService', function (lodash, d3Service, mockDataService) {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch("viewModelService.viewModel.version", function(newValue, oldValue) {
        d3Service.d3().then(draw);
      });

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

        svg.on('contextmenu', function (data, index) {
          d3.selectAll('.popup-tags-table').style("display", "none");

          if (d3.select('.d3-context-menu').style('display') !== 'block') {
            showContextMenu(data, index, canvasContextMenu);
          }
        });

        var zoom = d3.behavior.zoom()
            .scaleExtent([0.5, 12])
            .on("zoom", zoomed);

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
            .charge(-625)
            .linkDistance(function (d) {
              return d.distance;
            }).links(graph.links)

          // Create all the line svgs but without locations yet.
          var link = g.selectAll(".link")
            .data(graph.links)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-dasharray", function (d) {
              return d.dashes ? ("3, 3") : ("1, 0");
            })
            .style("stroke-width", function (d) {
              return d.thickness;
            });
        }

        if (!graph.settings.clustered) {
          graph.nodes.forEach(function (n) {
            if (n.fixed) {
              n.fixed = 8;
            }

            var radius = graph.nodes.length * 3;
            var startingPosition = getRandomStartingPosition(radius);

            n.x = center[0] + startingPosition[0];
            n.y = center[1] + startingPosition[1];
          });
        }

        force.nodes(graph.nodes)
          .start();

        if (!graph.settings.clustered) {
          setTimeout(function () {
            force.charge(-1250).start();
          }, 200);
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

        node.append("circle")
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

        if (graph.settings.clustered) {
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

        function showPopupTagsTable(d) {
          // Only start the popup transition if the context-menu is not displayed, the node is not being dragged, and
          // the popup is not already displayed.
          if (d3.select('.d3-context-menu').style('display') !== 'block'
              && !d.dragging
              && d3.select('.popup-tags-table').style('display') !== 'block') {
            d3.selectAll('.popup-tags-table').html('');

            if (d.tags && d.tags.length) {
              var tagsToDisplay = lodash.filter(d.tags, function(n) {
                return !n.hide;
              });

              var tr = d3.selectAll('.popup-tags-table').append("table")
                .selectAll("tr")
                .data(tagsToDisplay)
                .enter()
                .append("tr");

              var td = tr.selectAll("td")
                .data(function (d) {
                  return [d.key, {value: d.value, type: d.type}];
                })
                .enter().append("td")
                .append("a")
                .attr("class", function (d) {
                  if (d !== null && typeof d === 'object') {
                    return d.type === 'link' ? "" : "not-a-link";
                  } else {
                    return "not-a-link";
                  }
                })
                .attr("href", function (d) {
                  if (d !== null && typeof d === 'object') {
                    return d.type === 'link' ? d.value : "";
                  } else {
                    return d;
                  }
                })
                .text(function (d) {
                  if (d !== null && typeof d === 'object') {
                    return d.value;
                  } else {
                    return d;
                  }
                });

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

                siblingText.setAttribute("dx", d.x);
                siblingText.setAttribute("dy", d.y);
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
            link.attr("x1", function (d) {
              return d.source.x;
            })
              .attr("y1", function (d) {
                return d.source.y;
              })
              .attr("x2", function (d) {
                return d.target.x;
              })
              .attr("y2", function (d) {
                return d.target.y;
              });

            d3.selectAll("circle").attr("cx", function (d) {
              return d.x;
            })
              .attr("cy", function (d) {
                return d.y;
              });

            d3.selectAll("text").attr("x", function (d) {
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

        // TODO(duftler): Externalize scaling interval.
        var canvasContextMenu = [
          {
            title: 'Zoom:'
          },
          {
            title: '&nbsp;&nbsp;In',
            action: function(elm, d, i) {
              adjustZoom(1.5);
            }
          },
          {
            title: '&nbsp;&nbsp;Out',
            action: function(elm, d, i) {
              adjustZoom(1 / 1.5);
            }
          },
          {
            title: '&nbsp;&nbsp;Reset',
            action: function (elm, d, i) {
              adjustZoom();
            }
          },
          {
            title: 'Samples:'
          },
          // TODO(duftler): If we don't get rid of this Samples section entirely, build the list dynamically.
          {
            title: '&nbsp;&nbsp;Show All Types',
            action: function(elm, d, i) {
              scope.viewModelService.setViewModel(mockDataService.samples[0].data);
              scope.$apply();
            }
          },
          {
            title: '&nbsp;&nbsp;Hide Containers',
            action: function(elm, d, i) {
              scope.viewModelService.setViewModel(mockDataService.samples[1].data);
              scope.$apply();
            }
          },
          {
            title: '&nbsp;&nbsp;Clustered',
            action: function(elm, d, i) {
              scope.viewModelService.setViewModel(mockDataService.samples[2].data);
              scope.$apply();
            }
          }
        ];

        var nodeContextMenu = [
          {
            title: function(d) {
              return d.fixed & 8 ? "Unlock" : "Lock";
            },
            action: function(elm, d, i) {
              if (d.fixed) {
                d.fixed &= ~8;
                force.resume();
              } else {
                d.fixed |= 8;
              }
            }
          }
        ];

        function wheelScrollHandler() {
          var origTranslate = zoom.translate();

          zoom.translate([origTranslate[0] - window.event.deltaX, origTranslate[1] - window.event.deltaY]);
          zoomed();
        }

        function zoomed() {
          g.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
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
