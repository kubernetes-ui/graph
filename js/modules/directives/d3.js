angular.module('krakenApp.Graph')
    .directive('d3Visualization', ['lodash', 'd3Service', '$location',
                                   'inspectNodeService',
                                   function (lodash, d3Service, $location, inspectNodeService) {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch('viewModelService.viewModel.version', function(newValue, oldValue) {
        d3Service.d3().then(draw);
      });

      scope.$watch('selectionIdList', function(newValue, oldValue) {
        if (newValue !== undefined) {
          selectJustTheseNodes(newValue);
        }
      });

      var CONSTANTS = {
        FIXED_DRAGGING_BIT: 2,
        FIXED_MOUSEOVER_BIT: 4,
        FIXED_PINNED_BIT: 8,
        SHOWPIN_MOUSEOVER_BIT: 2,
        SHOWPIN_METAKEYDOWN_BIT: 4,
        OPACITY_MOUSEOVER: 0.7,
        OPACITY_DESELECTED: 0.2,
        // TODO: Externalize these defaults.
        DEFAULTS: {
          FORCE_CLUSTERED_GRAVITY: 0.02,
          FORCE_CLUSTERED_CHARGE: 0,
          FORCE_CLUSTERED_REFRESH_STARTING_ALPHA: 0.02,
          FORCE_NONCLUSTERED_GRAVITY: 0.40,
          FORCE_NONCLUSTERED_CHARGE: -1250,
          FORCE_NONCLUSTERED_REFRESH_STARTING_ALPHA: 0.01,
          FORCE_REFRESH_THRESHOLD_PERCENTAGE: 0.25,
          CLUSTER_INNER_PADDING: 4,
          CLUSTER_OUTER_PADDING: 32
        }
      };

      var viewSettingsCache = {};
      var nodeSettingsCache = {};

      var selection = {
        nodes: new Set(),
        edges: new Set(),
        edgelabels: new Set()
      };

      var node;
      var link;
      var edgelabels;
      var force;

      var selectJustTheseNodes = function(idList) {
        selection.nodes = new Set();

        idList.forEach(function (e) {
          selection.nodes.add({id: e});
        });

        selectEdgesInScope();

        applySelectionToOpacity();
      };

      function selectEdgesInScope() {
        selection.edges.clear();
        selection.edgelabels.clear();

        // Add each edge where both the source and target nodes are selected.
        if (link) {
          link.each(function (e) {
            if (setHas(selection.nodes, e.source) && setHas(selection.nodes, e.target)) {
              selection.edges.add(e);
            }
          });
        }

        // Add each edge label where both the source and target nodes are selected.
        if (edgelabels) {
          edgelabels.each(function (e) {
            if (setHas(selection.nodes, e.source) && setHas(selection.nodes, e.target)) {
              selection.edgelabels.add(e);
            }
          });
        }
      }

      function applySelectionToOpacity() {
        var notSelectedOpacity = CONSTANTS.OPACITY_DESELECTED;

        // If nothing is selected, show everything.
        if (!selection.nodes.size && !selection.edges.size && !selection.edgelabels.size) {
          notSelectedOpacity = 1;
        }

        // Reduce the opacity of all but the selected nodes.
        node.style('opacity', function (e) {
          var newOpacity = setHas(selection.nodes, e) ? 1 : notSelectedOpacity;

          if (e.origOpacity) {
            e.origOpacity = newOpacity;
          }

          return newOpacity;
        });

        // Reduce the opacity of all but the selected edges.
        if (link) {
          link.style('opacity', function (e) {
            return setHas(selection.edges, e) ? 1 : notSelectedOpacity;
          });
        }

        // Reduce the opacity of all but the selected edge labels.
        if (edgelabels) {
          edgelabels.style('opacity', function (e) {
            return setHas(selection.edgelabels, e) ? 1 : notSelectedOpacity;
          });
        }

        var selectionIdList = [];

        selection.nodes.forEach(function (e) {
          if (e.id !== undefined) {
            selectionIdList.push(e.id);
          }
        });

        scope.viewModelService.viewModel.configuration.selectionIdList = selectionIdList;

        _.defer(function() {
          scope.$apply();
        });
      }

      // Match on Set.has() or id.
      function setHas(searchSet, item) {
        if (searchSet.has(item)) {
          return true;
        }

        var found = false;

        searchSet.forEach(function (e) {
          if (e.id !== undefined && e.id === item.id) {
            found = true;
            return;
          }
        });

        return found;
      }

      var draw = function() {
        // We want to stop any prior simulation before starting a new one.
        if (force) {
          force.stop();
        }

        var d3 = window.d3;
        d3.select(window).on('resize', resize);

        var containerDimensions = getContainerDimensions();

        // TODO(duftler): Derive the svg height from the container rather than the other way around.
        var width = containerDimensions[0] - 16,
          height = 700,
          center = [width / 2, height / 2];

        var color = d3.scale.category20();

        d3.select(element[0]).select('svg').remove();

        var svg = d3.select(element[0])
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('class', 'graph');

        svg.append('defs').selectAll('marker')
          .data(['suit', 'licensing', 'resolved'])
          .enter().append('marker')
          .attr('id', function(d) { return d; })
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 60)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .attr('markerUnits', 'userSpaceOnUse')
          .append('path')
          .attr('d', 'M0,-5L10,0L0,5 L10,0 L0, -5')
          .style('stroke', 'black')
          .style('opacity', '1');

        svg.on('contextmenu', function (data, index) {
          if (d3.select('.d3-context-menu').style('display') !== 'block') {
            showContextMenu(data, index, canvasContextMenu);
          }

          // Even if we don't show a new context menu, we don't want the browser's default context menu shown.
          d3.event.preventDefault();
        });

        var zoom = d3.behavior.zoom()
          .scaleExtent([0.5, 12])
          .on('zoom', zoomed);

        if (viewSettingsCache.translate && viewSettingsCache.scale) {
          zoom.translate(viewSettingsCache.translate).scale(viewSettingsCache.scale);
        }

        var g = svg.append('g');

        svg.call(zoom).on('dblclick.zoom', null).call(zoom.event);

        var origWheelZoomHandler = svg.on('wheel.zoom');
        svg.on('wheel.zoom', wheelScrollHandler);

        var showPin = 0;

        d3.select('body')
          .on('keydown', function() {
            if (d3.event.ctrlKey) {
              svg.on('wheel.zoom', origWheelZoomHandler);
              svg.attr('class', 'graph zoom-cursor');
            } else if (d3.event.metaKey) {
              showPin |= CONSTANTS.SHOWPIN_METAKEYDOWN_BIT;

              if (showPin === (CONSTANTS.SHOWPIN_MOUSEOVER_BIT + CONSTANTS.SHOWPIN_METAKEYDOWN_BIT)) {
                svg.attr('class', 'graph pin-cursor');
              }
            }
          })
          .on('keyup', function() {
            if (!d3.event.ctrlKey) {
              svg.on('wheel.zoom', wheelScrollHandler);
              svg.attr('class', 'graph');
            }

            if (!d3.event.metaKey) {
              showPin &= ~CONSTANTS.SHOWPIN_METAKEYDOWN_BIT;
              svg.attr('class', 'graph');
            }
          });

        function windowBlur() {
          // If we Cmd-Tab away from this window, the keyup event won't have a chance to fire.
          // Unsetting this bit here ensures that the Pin cursor won't be displayed when focus returns to this window.
          showPin &= ~CONSTANTS.SHOWPIN_METAKEYDOWN_BIT;
          svg.attr('class', 'graph');
        }

        window.addEventListener('blur', windowBlur);

        var drag = d3.behavior.drag()
          .origin(function(d) { return d; })
          .on('dragstart', dragstarted)
          .on('drag', dragmove)
          .on('dragend', dragended);

        var graph = undefined;
        if (scope.viewModelService) {
          graph = scope.viewModelService.viewModel.data;
        }

        if (graph === undefined) {
          return;
        }

        force = d3.layout.force()
          .size([width, height])
          .on('tick', tick);

        var clusterInnerPadding;
        var clusterOuterPadding;

        if (graph.settings.clustered) {
          force
            .gravity(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_GRAVITY)
            .charge(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_CHARGE);

          clusterInnerPadding = getClusterInnerPadding();
          clusterOuterPadding = getClusterOuterPadding();
        } else {
          force
            .gravity(CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_GRAVITY)
            .charge(CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_CHARGE)
            .linkDistance(function (d) {
              return d.distance;
            }).links(graph.links);

          // Create all the line svgs but without locations yet.
          link = g.selectAll('.link')
            .data(graph.links)
            .enter().append('line')
            .attr('class', 'link')
            .style('marker-end', function (d) {
              if (d.directed) {
                return 'url(#suit)';
              }

              return 'none';
            })
            .style('stroke', function (d) {
              return d.stroke;
            })
            .style('stroke-dasharray', function (d) {
              return d.dash ? (d.dash + ', ' + d.dash) : ('1, 0');
            })
            .style('stroke-width', function (d) {
              return d.width;
            });
        }

        var selectedNodeSet = new Set();
        var newPositionCount = 0;

        // Apply all cached settings and count number of nodes with new positions.
        graph.nodes.forEach(function (n) {
          if (applyCachedSettingsToNodes(n, selectedNodeSet)) {
            ++newPositionCount;
          }
        });

        // If any nodes in the graph are explicitly selected, the cached selection is overridden.
        if (selectedNodeSet.size) {
          selection.nodes = selectedNodeSet;
        }

        force.nodes(graph.nodes);

        // TODO(duftler): Remove this after we investigate why so many new id's are returned on 'Refresh'.
        console.log('graph.nodes.length=' + graph.nodes.length + ' newPositionCount=' + newPositionCount);

        if (newPositionCount < (CONSTANTS.DEFAULTS.FORCE_REFRESH_THRESHOLD_PERCENTAGE * graph.nodes.length)) {
          var startingAlpha =
            graph.settings.clustered
            ? CONSTANTS.DEFAULTS.FORCE_CLUSTERED_REFRESH_STARTING_ALPHA
            : CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_REFRESH_STARTING_ALPHA;

          force.start().alpha(startingAlpha);
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
            if (!clusters[d.cluster] || (d.radius > clusters[d.cluster].radius)) {
              clusters[d.cluster] = d;
            }
          });

          return clusters;
        }

        // The largest node for each cluster.
        var clusters;

        if (graph.settings.clustered) {
          clusters = buildClusters(graph.nodes);
        }

        node = g.selectAll('.node')
          .data(graph.nodes)
          .enter().append('g')
          .attr('class', 'node')
          .on('mouseover', d3_layout_forceMouseover)
          .on('mouseout', d3_layout_forceMouseout)
          .on('mouseup', mouseup)
          .call(drag);

        function mouseup(d) {
          if (!d3.event.metaKey) {
            if (d.dragMoved === undefined || !d.dragMoved) {
              toggleSelected(d);
            }
          } else {
            togglePinned(d);
          }
        }

        // create the div element that will hold the context menu
        d3.selectAll('.d3-context-menu')
          .data([1])
          .enter()
          .append('div')
          .attr('class', 'd3-context-menu');

        // close menu
        d3.select('body')
          .on('click.d3-context-menu', function() {
            d3.select('.d3-context-menu').style('display', 'none');
          });

        node.each(function (n) {
          var singleNode = d3.select(this);

          if (n.icon) {
            singleNode.append('image')
              .attr('xlink:href', function (d) {
                return d.icon;
              })
              .attr('width', function (d) {
                return d.size[0];
              })
              .attr('height', function (d) {
                return d.size[1];
              })
              .on('contextmenu', function (data, index) {
                showContextMenu(data, index, nodeContextMenu);
              });
          } else {
            singleNode.append('circle')
              .attr('r', function (d) {
                return d.radius;
              })
              .style('stroke', function (d) {
                return d.stroke;
              })
              .style('fill', function (d) {
                return d.fill;
              })
              .on('contextmenu', function (data, index) {
                showContextMenu(data, index, nodeContextMenu);
              });
          }
        });

        var text = node.append('text')
          .attr('dx', 10)
          .attr('dy', '.35em');

        text.text(function (d) {
            return graph.settings.showNodeLabels && !d.hideLabel ? d.name : '';
          });

        text.each(function (e) {
          var singleText = d3.select(this);
          var parentNode = singleText.node().parentNode;

          d3.select(parentNode).append('image')
            .attr('xlink:href', function (d) {
              return '/components/graph/img/Pin.svg';
            })
            .attr('display', function (d) {
              return d.fixed & CONSTANTS.FIXED_PINNED_BIT ? '' : 'none';
            })
            .attr('width', function (d) {
              return '13px';
            })
            .attr('height', function (d) {
              return '13px';
            });
        });

        if (!graph.settings.clustered && graph.settings.showEdgeLabels) {
          var edgepaths = g.selectAll('.edgepath')
            .data(graph.links)
            .enter()
            .append('path')
            .attr({
              d: function (d) {
                return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
              },
              class: 'edgepath',
              'fill-opacity': 0,
              'stroke-opacity': 0,
              fill: 'blue',
              stroke: 'red',
              id: function (d, i) {
                return 'edgepath' + i
              }
            })
            .style('pointer-events', 'none');

          edgelabels = g.selectAll('.edgelabel')
            .data(graph.links)
            .enter()
            .append('text')
            .style('pointer-events', 'none')
            .attr({
              class: 'edgelabel',
              id: function (d, i) {
                return 'edgelabel' + i
              },
              dx: function (d) {
                return d.distance / 3
              },
              dy: 0
            });

          edgelabels.append('textPath')
            .attr('xlink:href', function (d, i) {
              return '#edgepath' + i
            })
            .style('pointer-events', 'none')
            .text(function (d, i) {
              return d.label
            });
        }

        var circle = g.selectAll('circle');

        if (graph.settings.clustered && newPositionCount) {
          circle.attr('r', function (d) {
            return d.radius;
          })
        }

        // If zero nodes are in the current selection, reset the selection.
        var nodeMatches = new Set();

        node.each(function (e) {
          if (setHas(selection.nodes, e)) {
            nodeMatches.add(e);
          }
        });

        if (!nodeMatches.size) {
          resetSelection();
        } else {
          selection.nodes = nodeMatches;

          selectEdgesInScope();

          applySelectionToOpacity();
        }

        function showContextMenu(data, index, contextMenu) {
          var elm = this;

          d3.selectAll('.d3-context-menu').html('');
          var list = d3.selectAll('.d3-context-menu').append('ul');
          list.selectAll('li')
            .data(contextMenu)
            .enter()
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
            .style('display', 'block')
            .on('contextmenu', function() {
              d3.event.preventDefault();
            });

          d3.event.preventDefault();
        }

        // Create an array logging what is connected to what.
        var linkedByIndex = {};
        for (i = 0; i < graph.nodes.length; i++) {
          linkedByIndex[i + ',' + i] = 1;
        }

        if (graph.links) {
          graph.links.forEach(function (d) {
            linkedByIndex[d.source.index + ',' + d.target.index] = 1;
          });
        }

        // This function looks up whether a pair are neighbours.
        function neighboring(a, b) {
          // TODO(duftler): Add support for > 1 hops.
          if (scope.viewModelService.viewModel.configuration.selectionHops) {
            return linkedByIndex[a.index + ',' + b.index];
          } else {
            return false;
          }
        }

        function toggleSelected(d) {
          // Operation is to select nodes if either no nodes are currently selected or this node is not selected.
          var selectOperation = !selection.nodes.size || !setHas(selection.nodes, d);

          if (selectOperation) {
            // Add the clicked node.
            selection.nodes.add(d);

            // Add each node within 1 hop from the clicked node.
            node.each(function (e) {
              if (neighboring(d, e) | neighboring(e, d)) {
                selection.nodes.add(e);
              }
            });
          } else {
            // De-select the clicked node.
            selection.nodes.delete(d);

            // Remove each node within 1 hop from the clicked node.
            node.each(function (e) {
              if (neighboring(d, e) | neighboring(e, d)) {
                selection.nodes.delete(e);
              }
            });
          }

          selectEdgesInScope();

          applySelectionToOpacity();
        }

        function resetSelection() {
          // Show everything.
          selection.nodes.clear();
          selection.edges.clear();
          selection.edgelabels.clear();

          applySelectionToOpacity();
        }

        function resetPins() {
          node.each(function (d) {
            // Unset the appropriate bit on each node.
            d.fixed &= ~CONSTANTS.FIXED_PINNED_BIT;

            // Ensure the node is not marked in the cache as fixed.
            if (nodeSettingsCache[d.id]) {
              nodeSettingsCache[d.id].fixed = false;
            }
          });

          force.start().alpha(0.01);
        }

        // Now we are giving the SVGs coordinates - the force layout is generating the coordinates which this code is
        // using to update the attributes of the SVG elements.
        function tick(e) {
          var forceAlpha = force.alpha();

          node.style('opacity', function (e) {
            if (e.opacity) {
              var opacity = e.opacity;

              delete e.opacity;

              return opacity;
            }

            return d3.select(this).style('opacity');
          });

          if (graph.settings.clustered) {
            circle
              .each(cluster(10 * forceAlpha * forceAlpha))
              .each(collide(.5, clusterInnerPadding, clusterOuterPadding))
              .attr('cx', function (d) {
                return d.x;
              })
              .attr('cy', function (d) {
                return d.y;
              });
          } else {
            link
              .attr('x1', function (d) {
                var offsetX = d.source.icon ? d.source.size[0] / 2 : 0;

                return d.source.x + offsetX;
              })
              .attr('y1', function (d) {
                var offsetY = d.source.icon ? d.source.size[1] / 2 : 0;

                return d.source.y + offsetY;
              })
              .attr('x2', function (d) {
                var offsetX = d.target.icon ? d.target.size[0] / 2 : 0;

                return d.target.x + offsetX;
              })
              .attr('y2', function (d) {
                var offsetY = d.target.icon ? d.target.size[1] / 2 : 0;

                return d.target.y + offsetY;
              });

            g.selectAll('circle')
              .attr('cx', function (d) {
                return d.x;
              })
              .attr('cy', function (d) {
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

          var image = d3.selectAll('image');

          image.each(function (e) {
            var singleImage = d3.select(this);
            var siblingText = d3.select(singleImage.node().parentNode).select('text');
            var bbox = siblingText[0][0] ? siblingText[0][0].getBBox() : null;
            var isPinIcon = singleImage.attr('xlink:href') === '/components/graph/img/Pin.svg';

            singleImage
              .attr('display', function (d) {
                if (isPinIcon) {
                  return d.fixed & CONSTANTS.FIXED_PINNED_BIT ? '' : 'none';
                } else {
                  return '';
                }
              });

            singleImage
              .attr('x', function (d) {
                if (isPinIcon) {
                  if (siblingText.text() !== '') {
                    return d.x + bbox.width + 12;
                  } else {
                    return d.x - 5;
                  }
                } else {
                  return d.x
                }
              })
              .attr('y', function (d) {
                if (isPinIcon) {
                  return d.y - 5;
                } else {
                  return d.y;
                }
              });
          });

          if (forceAlpha < 0.04) {
            graph.nodes.forEach(function (n) {
              if (n.id) {
                if (!nodeSettingsCache[n.id]) {
                  nodeSettingsCache[n.id] = {};
                }

                nodeSettingsCache[n.id].position = [n.x, n.y];
              }
            });
          }

          d3.selectAll('text')
            .attr('x', function (d) {
              return d.x;
            })
            .attr('y', function (d) {
              return d.y;
            });
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

        function getClusterInnerPadding() {
          var result = CONSTANTS.DEFAULTS.CLUSTER_INNER_PADDING;

          if (graph.settings.clusterSettings && graph.settings.clusterSettings.innerPadding !== undefined) {
            result = graph.settings.clusterSettings.innerPadding;
          }

          return result;
        }

        function getClusterOuterPadding() {
          var result = CONSTANTS.DEFAULTS.CLUSTER_OUTER_PADDING;

          if (graph.settings.clusterSettings && graph.settings.clusterSettings.outerPadding !== undefined) {
            result = graph.settings.clusterSettings.outerPadding;
          }

          return result;
        }

        // Resolves collisions between d and all other circles.
        function collide(alpha, clusterInnerPadding, clusterOuterPadding) {
          var quadtree = d3.geom.quadtree(graph.nodes);
          return function (d) {
            var r = d.radius + maxRadius + Math.max(clusterInnerPadding, clusterOuterPadding),
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                  y = d.y - quad.point.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? clusterInnerPadding : clusterOuterPadding);
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
          },
          {
            title: 'Reset Selection',
            action: function (elm, d, i) {
              resetSelection();
            }
          },
          {
            title: 'Reset Pins',
            action: function (elm, d, i) {
              resetPins();
            }
          }
        ];

        var nodeContextMenu = [
          {
            title: function(d) {
              return 'Inspect Node';
            },
            action: function(elm, d, i) {
              inspectNode(d);
            }
          }
        ];

        function togglePinned(d) {
          if (!nodeSettingsCache[d.id]) {
            nodeSettingsCache[d.id] = {};
          }

          if (d.fixed & CONSTANTS.FIXED_PINNED_BIT) {
            d.fixed &= ~CONSTANTS.FIXED_PINNED_BIT;
            force.start().alpha(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_REFRESH_STARTING_ALPHA * 2);

            nodeSettingsCache[d.id].fixed = false;
          } else {
            d.fixed |= CONSTANTS.FIXED_PINNED_BIT;

            nodeSettingsCache[d.id].fixed = true;
            tick();
          }
        }

        function inspectNode(d, tagName) {
          if (tagName) {
            // Clone the node.
            d = JSON.parse(JSON.stringify(d));

            if (d.metadata && d.metadata[tagName]) {
              // Prefix the tag name with asterisks so it stands out in the details view.
              d.metadata['** ' + tagName] = d.metadata[tagName];

              // Remove the non-decorated tag.
              delete d.metadata[tagName];
            }
          }

          // Add the node details into the service, to be consumed by the
          // next controller.
          inspectNodeService.setDetailData(d);

          // Redirect to the detail view page.
          $location.path('/graph/inspect');
          scope.$apply();
        }

        function wheelScrollHandler() {
          var origTranslate = zoom.translate();

          zoom.translate([origTranslate[0] - window.event.deltaX, origTranslate[1] - window.event.deltaY]);
          zoomed();
        }

        function zoomed() {
          var translate = zoom.translate();
          var scale = zoom.scale();

          g.attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

          viewSettingsCache.translate = translate;
          viewSettingsCache.scale = scale;
        }

        function dragstarted(d) {
          d3.event.sourceEvent.stopPropagation();

          d.fixed |= CONSTANTS.FIXED_DRAGGING_BIT;
          d.dragging = true;
        }

        function dragmove(d) {
          d.dragMoved = true;
          d.px = d3.event.x, d.py = d3.event.y;
          force.start().alpha(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_REFRESH_STARTING_ALPHA * 2);
        }

        function dragended(d) {
          d.fixed &= ~(CONSTANTS.FIXED_DRAGGING_BIT + CONSTANTS.FIXED_MOUSEOVER_BIT);
          d.dragging = false;
          d.dragMoved = false;
        }

        function d3_layout_forceMouseover(d) {
          // If we use Cmd-Tab but don't navigate away from this window, the keyup event won't have a chance to fire.
          // Unsetting this bit here ensures that the Pin cursor won't be displayed when mousing over a node, unless
          // the Cmd key is down.
          if (!d3.event.metaKey) {
            showPin &= ~CONSTANTS.SHOWPIN_METAKEYDOWN_BIT;
          }

          showPin |= CONSTANTS.SHOWPIN_MOUSEOVER_BIT;

          // We show the Pin cursor if the cursor is over the node and the command key is depressed.
          if (showPin === (CONSTANTS.SHOWPIN_MOUSEOVER_BIT + CONSTANTS.SHOWPIN_METAKEYDOWN_BIT)) {
            svg.attr('class', 'graph pin-cursor');
          }

          d.fixed |= CONSTANTS.FIXED_MOUSEOVER_BIT;
          d.px = d.x, d.py = d.y;

          // We capture the original opacity so we have a value to return to after removing the cursor from this node.
          d.origOpacity = d3.select(this).style('opacity');

          if (d.icon) {
            // Set the opacity here if the node is an icon.
            d.opacity = CONSTANTS.OPACITY_MOUSEOVER;
          } else {
            // Or if it is a circle that is already dimmed.
            if (d.origOpacity - CONSTANTS.OPACITY_DESELECTED < 0.001) {
              d.opacity = CONSTANTS.OPACITY_MOUSEOVER;
            }

            // Circles also get an outline.
            d3.select(this)
              .style('stroke', 'black')
              .style('stroke-width', '2')
              .style('stroke-opacity', 0.5);
          }

          tick();
        }

        function d3_layout_forceMouseout(d) {
          showPin &= ~CONSTANTS.SHOWPIN_MOUSEOVER_BIT;
          svg.attr('class', 'graph');

          d.fixed &= ~CONSTANTS.FIXED_MOUSEOVER_BIT;

          if (d.origOpacity) {
            d.opacity = d.origOpacity;
            delete d.origOpacity;

            // Remove any outline.
            d3.select(this).style('stroke', '');
          }

          tick();
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
          d3.transition().duration(350).tween('zoom', function () {
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
          var width = parseInt(parentNode.style('width'));
          var height = parseInt(parentNode.style('height'));

          return [width, height];
        }

        function resize() {
          var containerDimensions = getContainerDimensions();
          var width = containerDimensions[0] - 16;
          var height = containerDimensions[1] - 19;
          var svg = d3.select(element[0]).select('svg');

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

        // Apply all cached settings to nodes, giving precedence to properties explicitly specified in the view model.
        // Return true if the given node has neither a specified nor cached position. Return false otherwise.
        function applyCachedSettingsToNodes(n, selectedNodeSet) {
          var noSpecifiedOrCachedPosition = false;
          var cachedSettings;

          if (n.id) {
            cachedSettings = nodeSettingsCache[n.id];
          }

          if (n.fixed) {
            // If view model specifies node is fixed, it's fixed.
            n.fixed = CONSTANTS.FIXED_PINNED_BIT;
          } else if (cachedSettings && cachedSettings.fixed) {
            // Otherwise, take into account the fixed property from the cache.
            n.fixed = CONSTANTS.FIXED_PINNED_BIT;
          }

          if (n.position) {
            // If view model specifies position use that as the starting position.
            n.x = n.position[0];
            n.y = n.position[1];

            noSpecifiedOrCachedPosition = true;
          } else if (cachedSettings) {
            // Otherwise, take into account the position from the cache.
            var cachedPosition = cachedSettings.position;

            if (cachedPosition) {
              n.x = cachedPosition[0];
              n.y = cachedPosition[1];
            }
          }

          // If we have neither a view model specified position, nor a cached position, use a random starting position
          // within some radius of the canvas center.
          if (!n.x && !n.y) {
            var radius = graph.nodes.length * 3;
            var startingPosition = getRandomStartingPosition(radius);

            n.x = center[0] + startingPosition[0];
            n.y = center[1] + startingPosition[1];

            noSpecifiedOrCachedPosition = true;
          }

          // Build up a set of nodes the view model specifies are to be selected.
          if (n.selected && n.id !== 'undefined') {
            selectedNodeSet.add({id: n.id});
          }

          return noSpecifiedOrCachedPosition;
        }
      };
    }
  };
}]);
