/**
 Copyright 2015 Google Inc. All rights reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph.
 * This is a service that provides rendering capabilities
 * for use by the d3 visualization directive.
 =========================================================*/

(function() {
  'use strict';

  var d3RenderingService = function(lodash, d3UtilitiesService, $location, $rootScope, inspectNodeService) {

    function rendering() {
      var CONSTANTS = {
        FIXED_DRAGGING_BIT: 2,
        FIXED_MOUSEOVER_BIT: 4,
        FIXED_PINNED_BIT: 8,
        SHOWPIN_MOUSEOVER_BIT: 2,
        SHOWPIN_METAKEYDOWN_BIT: 4,
        OPACITY_MOUSEOVER: 0.7,
        OPACITY_DESELECTED: 0.2,
        // TODO(duftler): Externalize these defaults.
        DEFAULTS: {
          SVG_INITIAL_HEIGHT: 700,
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

      var directiveElement;
      var controllerScope;

      // Used to maintain settings that must survive refresh.
      var viewSettingsCache = {};
      var nodeSettingsCache = {};

      // Contains the currently-seleted resources.
      var selection = {nodes: new Set(), edges: new Set(), edgelabels: new Set()};

      var node;
      var circle;
      var image;
      var link;
      var edgepaths;
      var edgelabels;
      var force;
      var zoom;
      var g;
      var center;

      // Used to store the largest node for each cluster.
      var builtClusters;
      // The configured padding between nodes within a cluster.
      var clusterInnerPadding;
      // The configured padding between clusters.
      var clusterOuterPadding;

      // Select all edges and edgelabels where both the source and target nodes are selected.
      function selectEdgesInScope() {
        selection.edges.clear();
        selection.edgelabels.clear();

        // Add each edge where both the source and target nodes are selected.
        if (link) {
          link.each(function(e) {
            if (d3UtilitiesService.setHas(selection.nodes, e.source) &&
                d3UtilitiesService.setHas(selection.nodes, e.target)) {
              selection.edges.add(e);
            }
          });
        }

        // Add each edge label where both the source and target nodes are selected.
        if (edgelabels) {
          edgelabels.each(function(e) {
            if (d3UtilitiesService.setHas(selection.nodes, e.source) &&
                d3UtilitiesService.setHas(selection.nodes, e.target)) {
              selection.edgelabels.add(e);
            }
          });
        }
      }

      // Adjust the opacity of all resources to indicate selected items.
      function applySelectionToOpacity() {
        var notSelectedOpacity = CONSTANTS.OPACITY_DESELECTED;

        // If nothing is selected, show everything.
        if (!selection.nodes.size && !selection.edges.size && !selection.edgelabels.size) {
          notSelectedOpacity = 1;
        }

        // Reduce the opacity of all but the selected nodes.
        node.style('opacity', function(e) {
          var newOpacity = d3UtilitiesService.setHas(selection.nodes, e) ? 1 : notSelectedOpacity;

          if (e.origOpacity) {
            e.origOpacity = newOpacity;
          }

          return newOpacity;
        });

        // Reduce the opacity of all but the selected edges.
        if (link) {
          link.style('opacity', function(e) {
            return d3UtilitiesService.setHas(selection.edges, e) ? 1 : notSelectedOpacity;
          });
        }

        // Reduce the opacity of all but the selected edge labels.
        if (edgelabels) {
          edgelabels.style('opacity', function(e) {
            return d3UtilitiesService.setHas(selection.edgelabels, e) ? 1 : notSelectedOpacity;
          });
        }

        var selectionIdList = [];

        selection.nodes.forEach(function(e) {
          if (e.id !== undefined) {
            selectionIdList.push(e.id);
          }
        });

        controllerScope.viewModelService.setSelectionIdList(selectionIdList);

        _.defer(function() {
          $rootScope.$apply();
          autosizeSVG(d3, false);
        });
      }

      // Return the dimensions of the parent element of the d3 visualization directive.
      function getParentContainerDimensions(d3) {
        var parentNode = d3.select(directiveElement.parentNode);
        var width = parseInt(parentNode.style('width'));
        var height = parseInt(parentNode.style('height'));

        return [width, height];
      }

      // Resize the svg element.
      function resizeSVG(d3, newSVGDimensions) {
        var svg = d3.select(directiveElement).select('svg');
        var width = newSVGDimensions[0];
        var height = newSVGDimensions[1];

        svg.attr('width', width);
        svg.attr('height', height);

        // We want the width and height to survive redraws.
        viewSettingsCache.width = width;
        viewSettingsCache.height = height;

        force.size([width, height]);
      }

      // Adjust the size of the svg element to a new size derived from the dimensions of the parent.
      function autosizeSVG(d3, windowWasResized) {
        var containerDimensions = getParentContainerDimensions(d3);
        var width = containerDimensions[0] - 16;
        var height = containerDimensions[1] - 19;

        resizeSVG(d3, [width, height]);

        if (windowWasResized) {
          force.resume();
        }
      }

      // Render the graph.
      function graph() {
        // We want to stop any prior simulation before starting a new one.
        if (force) {
          force.stop();
        }

        var d3 = window.d3;
        d3.select(window).on('resize', windowWasResized);

        // TODO(duftler): Derive the initial svg height from the container rather than the other way around.
        var width = viewSettingsCache.width ? viewSettingsCache.width : getParentContainerDimensions(d3)[0] - 16;
        var height = viewSettingsCache.height ? viewSettingsCache.height : CONSTANTS.DEFAULTS.SVG_INITIAL_HEIGHT;

        center = [width / 2, height / 2];

        var color = d3.scale.category20();

        d3.select(directiveElement).select('svg').remove();

        var svg = d3.select(directiveElement)
                      .append('svg')
                      .attr('width', width)
                      .attr('height', height)
                      .attr('class', 'graph');

        svg.append('defs')
            .selectAll('marker')
            .data(['suit', 'licensing', 'resolved'])
            .enter()
            .append('marker')
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

        svg.on('contextmenu', function(data, index) {
          if (d3.select('.d3-context-menu').style('display') !== 'block') {
            d3UtilitiesService.showContextMenu(d3, data, index, canvasContextMenu);
          }

          // Even if we don't show a new context menu, we don't want the browser's default context menu shown.
          d3.event.preventDefault();
        });

        zoom = d3.behavior.zoom().scaleExtent([0.5, 12]).on('zoom', zoomed);

        if (viewSettingsCache.translate && viewSettingsCache.scale) {
          zoom.translate(viewSettingsCache.translate).scale(viewSettingsCache.scale);
        }

        g = svg.append('g');

        svg.call(zoom).on('dblclick.zoom', null).call(zoom.event);

        var origWheelZoomHandler = svg.on('wheel.zoom');
        svg.on('wheel.zoom', wheelScrollHandler);

        var showPin = 0;

        d3.select('body')
            .on('keydown',
                function() {
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
        if (controllerScope.viewModelService) {
          graph = controllerScope.viewModelService.viewModel.data;
        }

        if (graph === undefined) {
          return;
        }

        force = d3.layout.force().size([width, height]).on('tick', tick);

        if (graph.configuration.settings.clustered) {
          force.gravity(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_GRAVITY).charge(CONSTANTS.DEFAULTS.FORCE_CLUSTERED_CHARGE);

          clusterInnerPadding = getClusterInnerPadding();
          clusterOuterPadding = getClusterOuterPadding();
        } else {
          force.gravity(CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_GRAVITY)
              .charge(CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_CHARGE)
              .linkDistance(function(d) { return d.distance; })
              .links(graph.links);

          // Create all the line svgs but without locations yet.
          link = g.selectAll('.link')
                     .data(graph.links)
                     .enter()
                     .append('line')
                     .attr('class', 'link')
                     .style('marker-end',
                            function(d) {
                              if (d.directed) {
                                return 'url(#suit)';
                              }
                              return 'none';
                            })
                     .style('stroke', function(d) { return d.stroke; })
                     .style('stroke-dasharray', function(d) { return d.dash ? (d.dash + ', ' + d.dash) : ('1, 0'); })
                     .style('stroke-width', function(d) { return d.width; });
        }

        var selectedNodeSet = new Set();
        var newPositionCount = 0;

        // Apply all cached settings and count number of nodes with new positions.
        graph.nodes.forEach(function(n) {
          if (applyCachedSettingsToNodes(n, selectedNodeSet)) {
            ++newPositionCount;
          }
        });

        // If any nodes in the graph are explicitly selected, the cached selection is overridden.
        if (selectedNodeSet.size) {
          selection.nodes = selectedNodeSet;
        }

        force.nodes(graph.nodes);

        if (newPositionCount < (CONSTANTS.DEFAULTS.FORCE_REFRESH_THRESHOLD_PERCENTAGE * graph.nodes.length)) {
          var startingAlpha = graph.configuration.settings.clustered ?
                                  CONSTANTS.DEFAULTS.FORCE_CLUSTERED_REFRESH_STARTING_ALPHA :
                                  CONSTANTS.DEFAULTS.FORCE_NONCLUSTERED_REFRESH_STARTING_ALPHA;

          force.start().alpha(startingAlpha);
        } else {
          force.start();
        }

        if (graph.configuration.settings.clustered) {
          builtClusters = d3UtilitiesService.buildClusters(graph.nodes);
        }

        node = g.selectAll('.node')
                   .data(graph.nodes)
                   .enter()
                   .append('g')
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

        // Create the div element that will hold the context menu.
        d3.selectAll('.d3-context-menu').data([1]).enter().append('div').attr('class', 'd3-context-menu');

        // Close context menu.
        d3.select('body')
            .on('click.d3-context-menu', function() { d3.select('.d3-context-menu').style('display', 'none'); });

        node.each(function(n) {
          var singleNode = d3.select(this);

          if (n.icon) {
            singleNode.append('image')
                .attr('xlink:href', function(d) { return d.icon; })
                .attr('width', function(d) { return d.size[0]; })
                .attr('height', function(d) { return d.size[1]; })
                .on('contextmenu', function(data, index) {
                  d3UtilitiesService.showContextMenu(d3, data, index, nodeContextMenu);
                });
          } else {
            singleNode.append('circle')
                .attr('r', function(d) { return d.radius; })
                .style('stroke', function(d) { return d.stroke; })
                .style('fill', function(d) { return d.fill; })
                .on('contextmenu', function(data, index) {
                  d3UtilitiesService.showContextMenu(d3, data, index, nodeContextMenu);
                });
          }
        });

        var text = node.append('text').attr('dx', 10).attr('dy', '.35em');

        text.text(function(d) { return graph.configuration.settings.showNodeLabels && !d.hideLabel ? d.name : ''; });

        text.each(function(e) {
          var singleText = d3.select(this);
          var parentNode = singleText.node().parentNode;

          d3.select(parentNode)
              .append('image')
              .attr('xlink:href', function(d) { return '/components/graph/img/Pin.svg'; })
              .attr('display', function(d) { return d.fixed & CONSTANTS.FIXED_PINNED_BIT ? '' : 'none'; })
              .attr('width', function(d) { return '13px'; })
              .attr('height', function(d) { return '13px'; });
        });

        if (!graph.configuration.settings.clustered && graph.configuration.settings.showEdgeLabels) {
          edgepaths = g.selectAll('.edgepath')
                          .data(graph.links)
                          .enter()
                          .append('path')
                          .attr({
                            d: function(d) {
                              return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
                            },
                            class: 'edgepath',
                            'fill-opacity': 0,
                            'stroke-opacity': 0,
                            fill: 'blue',
                            stroke: 'red',
                            id: function(d, i) { return 'edgepath' + i }
                          })
                          .style('pointer-events', 'none');

          edgelabels = g.selectAll('.edgelabel')
                           .data(graph.links)
                           .enter()
                           .append('text')
                           .style('pointer-events', 'none')
                           .attr({
                             class: 'edgelabel',
                             id: function(d, i) { return 'edgelabel' + i },
                             dx: function(d) { return d.distance / 3 },
                             dy: 0
                           });

          edgelabels.append('textPath')
              .attr('xlink:href', function(d, i) { return '#edgepath' + i })
              .style('pointer-events', 'none')
              .text(function(d, i) { return d.label });
        }

        circle = g.selectAll('circle');

        if (graph.configuration.settings.clustered && newPositionCount) {
          circle.attr('r', function(d) { return d.radius; })
        }

        image = d3.selectAll('image');

        // If zero nodes are in the current selection, reset the selection.
        var nodeMatches = new Set();

        node.each(function(e) {
          if (d3UtilitiesService.setHas(selection.nodes, e)) {
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

        // Create an array logging what is connected to what.
        var linkedByIndex = {};
        for (var i = 0; i < graph.nodes.length; i++) {
          linkedByIndex[i + ',' + i] = 1;
        }

        if (graph.links) {
          graph.links.forEach(function(d) { linkedByIndex[d.source.index + ',' + d.target.index] = 1; });
        }

        // Adjust selection in response to a single-click on a node.
        function toggleSelected(d) {
          // Operation is to select nodes if either no nodes are currently selected or this node is not selected.
          var selectOperation = !selection.nodes.size || !d3UtilitiesService.setHas(selection.nodes, d);

          if (selectOperation) {
            // Add the clicked node.
            selection.nodes.add(d);

            // Add each node within 1 hop from the clicked node.
            node.each(function(e) {
              if (d3UtilitiesService.neighboring(d, e, linkedByIndex,
                                                 controllerScope.viewModelService.getSelectionHops()) |
                  d3UtilitiesService.neighboring(e, d, linkedByIndex,
                                                 controllerScope.viewModelService.getSelectionHops())) {
                selection.nodes.add(e);
              }
            });
          } else {
            // De-select the clicked node.
            selection.nodes.delete(d);

            // Remove each node within 1 hop from the clicked node.
            node.each(function(e) {
              if (d3UtilitiesService.neighboring(d, e, linkedByIndex,
                                                 controllerScope.viewModelService.getSelectionHops()) |
                  d3UtilitiesService.neighboring(e, d, linkedByIndex,
                                                 controllerScope.viewModelService.getSelectionHops())) {
                selection.nodes.delete(e);
              }
            });
          }

          selectEdgesInScope();

          applySelectionToOpacity();
        }

        // Clear all selected resources.
        function resetSelection() {
          // Show everything.
          selection.nodes.clear();
          selection.edges.clear();
          selection.edgelabels.clear();

          applySelectionToOpacity();
        }

        // Return the configured padding between nodes within a cluster.
        function getClusterInnerPadding() {
          var result = CONSTANTS.DEFAULTS.CLUSTER_INNER_PADDING;

          if (graph.configuration.settings.clusterSettings &&
              graph.configuration.settings.clusterSettings.innerPadding !== undefined) {
            result = graph.configuration.settings.clusterSettings.innerPadding;
          }

          return result;
        }

        // Return the configured padding between clusters.
        function getClusterOuterPadding() {
          var result = CONSTANTS.DEFAULTS.CLUSTER_OUTER_PADDING;

          if (graph.configuration.settings.clusterSettings &&
              graph.configuration.settings.clusterSettings.outerPadding !== undefined) {
            result = graph.configuration.settings.clusterSettings.outerPadding;
          }

          return result;
        }

        // The context menu to display when not right-clicking on a node.
        var canvasContextMenu = [
          {title: 'Reset Zoom/Pan', action: function(elm, d, i) { adjustZoom(); }},
          {title: 'Reset Selection', action: function(elm, d, i) { resetSelection(); }},
          {title: 'Reset Pins', action: function(elm, d, i) { resetPins(); }}
        ];

        // The context menu to display when right-clicking on a node.
        var nodeContextMenu =
            [{title: function(d) { return 'Inspect Node'; }, action: function(elm, d, i) { inspectNode(d); }}];

        // Display 'Inspect' view for this node.
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
          $rootScope.$apply();
        }

        function wheelScrollHandler() {
          var origTranslate = zoom.translate();

          zoom.translate([origTranslate[0] - window.event.deltaX, origTranslate[1] - window.event.deltaY]);
          zoomed();
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
          d.px = d.x;
          d.py = d.y;

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
            d3.select(this).style('stroke', 'black').style('stroke-width', '2').style('stroke-opacity', 0.5);
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

        // Resize the svg element in response to the window resizing.
        function windowWasResized() { autosizeSVG(d3, true); }

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
            var startingPosition = d3UtilitiesService.getRandomStartingPosition(radius);

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
      }

      // Get or set the directive element. Returns the rendering service when acting as a setter.
      graph.directiveElement = function(newDirectiveElement) {
        if (!arguments.length) return directiveElement;
        directiveElement = newDirectiveElement;

        return this;
      };

      // Get or set the controller scope. Returns the rendering service when acting as a setter.
      graph.controllerScope = function(newControllerScope) {
        if (!arguments.length) return controllerScope;
        controllerScope = newControllerScope;

        return this;
      };

      // Return the dimensions of the parent container.
      graph.getParentContainerDimensions = function() { return getParentContainerDimensions(window.d3); };

      // Get or set the size of the svg element. Returns the rendering service when acting as a setter.
      graph.graphSize = function(newGraphSize) {
        if (!arguments.length) {
          var svg = window.d3.select(directiveElement)
                        .select('svg')

                            return [parseInt(svg.attr('width')), parseInt(svg.attr('height'))];
        } else {
          resizeSVG(window.d3, newGraphSize);

          return this;
        }
      };

      // Get or set the node selection. Returns the rendering service when acting as a setter.
      graph.nodeSelection = function(newNodeSelection) {
        if (!arguments.length) return selection.nodes;
        selection.nodes = newNodeSelection;

        selectEdgesInScope();

        applySelectionToOpacity();

        return this;
      };

      // Get or set the edge selection. Returns the rendering service when acting as a setter.
      graph.edgeSelection = function(newEdgeSelection) {
        if (!arguments.length) return selection.edges;
        selection.edges = newEdgeSelection;

        return this;
      };

      // Get or set the edgelabels selection. Returns the rendering service when acting as a setter.
      graph.edgelabelsSelection = function(newEdgelabelsSelection) {
        if (!arguments.length) return selection.edgelabels;
        selection.edgelabels = newEdgelabelsSelection;

        return this;
      };

      // Toggle the pinned state of this node.
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
      graph.togglePinned = togglePinned;

      // Clear all pinned nodes.
      function resetPins() {
        node.each(function(d) {
          // Unset the appropriate bit on each node.
          d.fixed &= ~CONSTANTS.FIXED_PINNED_BIT;

          // Ensure the node is not marked in the cache as fixed.
          if (nodeSettingsCache[d.id]) {
            nodeSettingsCache[d.id].fixed = false;
          }
        });

        force.start().alpha(0.01);
      }
      graph.resetPins = resetPins;

      function tick(e) {
        var forceAlpha = force.alpha();

        node.style('opacity', function(e) {
          if (e.opacity) {
            var opacity = e.opacity;

            delete e.opacity;

            return opacity;
          }

          return window.d3.select(this).style('opacity');
        });

        if (controllerScope.viewModelService.viewModel.data.configuration.settings.clustered) {
          circle.each(d3UtilitiesService.cluster(builtClusters, 10 * forceAlpha * forceAlpha))
              .each(d3UtilitiesService.collide(d3, controllerScope.viewModelService.viewModel.data.nodes,
                                               builtClusters, .5, clusterInnerPadding, clusterOuterPadding));

          image.each(d3UtilitiesService.cluster(builtClusters, 10 * forceAlpha * forceAlpha))
              .each(d3UtilitiesService.collide(d3, controllerScope.viewModelService.viewModel.data.nodes,
                                               builtClusters, .5, clusterInnerPadding, clusterOuterPadding));
        } else {
          link.attr('x1',
                    function(d) {
                      var offsetX = d.source.icon ? d.source.size[0] / 2 : 0;

                      return d.source.x + offsetX;
                    })
              .attr('y1',
                    function(d) {
                      var offsetY = d.source.icon ? d.source.size[1] / 2 : 0;

                      return d.source.y + offsetY;
                    })
              .attr('x2',
                    function(d) {
                      var offsetX = d.target.icon ? d.target.size[0] / 2 : 0;

                      return d.target.x + offsetX;
                    })
              .attr('y2', function(d) {
                var offsetY = d.target.icon ? d.target.size[1] / 2 : 0;

                return d.target.y + offsetY;
              });

          if (edgepaths) {
            edgepaths.attr('d', function(d) {
              var path = 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
              return path
            });

            edgelabels.attr('transform', function(d, i) {
              if (d.target.x < d.source.x) {
                var bbox = this.getBBox();
                var rx = bbox.x + bbox.width / 2;
                var ry = bbox.y + bbox.height / 2;

                return 'rotate(180 ' + rx + ' ' + ry + ')';
              } else {
                return 'rotate(0)';
              }
            });
          }
        }

        circle.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });

        image.each(function(e) {
          var singleImage = window.d3.select(this);
          var siblingText = window.d3.select(this.parentNode).select('text');
          var bbox = siblingText[0][0] ? siblingText[0][0].getBBox() : {width: 0};
          var isPinIcon = singleImage.attr('xlink:href') === '/components/graph/img/Pin.svg';

          singleImage.attr('display', function(d) {
            if (isPinIcon) {
              return d.fixed & CONSTANTS.FIXED_PINNED_BIT ? '' : 'none';
            } else {
              return '';
            }
          });

          singleImage.attr('x',
                           function(d) {
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
              .attr('y', function(d) {
                if (isPinIcon) {
                  return d.y - 5;
                } else {
                  return d.y;
                }
              });
        });

        if (forceAlpha < 0.04) {
          controllerScope.viewModelService.viewModel.data.nodes.forEach(function(n) {
            if (n.id) {
              if (!nodeSettingsCache[n.id]) {
                nodeSettingsCache[n.id] = {};
              }

              nodeSettingsCache[n.id].position = [n.x, n.y];
            }
          });
        }

        window.d3.selectAll('text').attr('x', function(d) { return d.x; }).attr('y', function(d) { return d.y; });
      }

      // Get or set the node settings cache. Returns the rendering service when acting as a setter.
      graph.nodeSettingsCache = function(newNodeSettingsCache) {
        if (!arguments.length) return nodeSettingsCache;
        nodeSettingsCache = newNodeSettingsCache;

        return this;
      };

      // Get or set the view settings cache. Returns the rendering service when acting as a setter.
      graph.viewSettingsCache = function(newViewSettingsCache) {
        if (!arguments.length) return viewSettingsCache;
        viewSettingsCache = newViewSettingsCache;

        return this;
      };

      function zoomed() {
        var translate = zoom.translate();
        var scale = zoom.scale();

        g.attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

        viewSettingsCache.translate = translate;
        viewSettingsCache.scale = scale;
      }

      function adjustZoom(factor) {
        var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate(), x = translate[0],
            y = translate[1], target_scale = scale * factor;

        var reset = !factor;

        if (reset) {
          target_scale = 1;
          factor = target_scale / scale;
        }

        // If we're already at an extent, done.
        if (target_scale === extent[0] || target_scale === extent[1]) {
          return false;
        }
        // If the factor is too much, scale it down to reach the extent exactly.
        var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
        if (clamped_target_scale != target_scale) {
          target_scale = clamped_target_scale;
          factor = target_scale / scale;
        }

        // Center each vector, stretch, then put back.
        x = (x - center[0]) * factor + center[0];
        y = (y - center[1]) * factor + center[1];

        if (reset) {
          x = 0;
          y = 0;
        }

        // Transition to the new view over 350ms
        window.d3.transition().duration(350).tween('zoom', function() {
          var interpolate_scale = window.d3.interpolate(scale, target_scale);
          var interpolate_trans = window.d3.interpolate(translate, [x, y]);

          return function(t) {
            zoom.scale(interpolate_scale(t)).translate(interpolate_trans(t));

            zoomed();
          };
        });
      }
      graph.adjustZoom = adjustZoom;

      return graph;
    }

    return {rendering: rendering};
  };

  angular.module('kubernetesApp.components.graph.services.d3.rendering', [])
      .service('d3RenderingService',
               ['lodash', 'd3UtilitiesService', '$location', '$rootScope', 'inspectNodeService', d3RenderingService]);

})();
