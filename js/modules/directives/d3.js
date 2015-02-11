angular.module('krakenApp.Graph')
    .directive('d3Visualization', ['d3Service', function (d3Service) {
        return {
            restrict: 'E',
            link: function (scope, element, attrs) {
                scope.$watch("viewModelService.viewModel.version", function(newValue, oldValue) {
                    d3Service.d3().then(draw);
                });

                var draw = function(d3) {
                    // TODO(duftler): Externalize these settings.
                    var width = 600,
                        height = 500;

                    var color = d3.scale.category20();

                    var svg = d3.select(element[0]).select("svg");
                    svg.remove();

                    svg = d3.select(element[0]).append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("class", "graph");

                    var graph = undefined;
                    if (scope.viewModelService.viewModel.data) {
                        graph = scope.viewModelService.viewModel.data;
                    } else {
                        graph = { 
                            "nodes" : [ 
                                { 
                                    "group" : 1,
                                    "name" : "no data",
                                    "radius" : 20
                                }
                            ],
                            "settings" : { 
                                "clusterSettings" : { 
                                    "clusterPadding" : 25,
                                    "padding" : 1.5
                                },
                                "clustered" : true,
                                "showEdgeLabels" : true,
                                "showNodeLabels" : true
                            }
                        };
                    }

                    var force = d3.layout.force()
                        .size([width, height])
                        .on("tick", tick);

                    if (graph.settings.clustered) {
                        force.gravity(.02)
                            .charge(0);
                    } else {
                        force.charge(-1250)
                            .linkDistance(function (d) {
                                return d.distance;
                            }).links(graph.links)

                        // Create all the line svgs but without locations yet.
                        var link = svg.selectAll(".link")
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

                    force.nodes(graph.nodes)
                        .start();

                    var maxRadius = -1;

                    function buildClusters(nodes) {
                        var maxCluster = -1;

                        nodes.forEach(function (d) {
                            maxCluster = Math.max(maxCluster, d.group);
                            maxRadius = Math.max(maxRadius, d.radius);
                        });

                        var clusters = new Array(maxCluster + 1);

                        nodes.forEach(function (d) {
                            if (!clusters[d.group] || (d.radius > clusters[d.group].radius)) clusters[d.group] = d;
                        });

                        return clusters;
                    }

                    // The largest node for each cluster.
                    var clusters = buildClusters(graph.nodes);

                    var node = svg.selectAll(".node")
                        .data(graph.nodes)
                        .enter().append("g")
                        .attr("class", "node")
                        .call(force.drag);

                    node.append("circle")
                        .attr("r", function (d) {
                            return d.radius;
                        })
                        .style("fill", function (d) {
                            return color(d.group);
                        })
                        .on("dblclick", dblclick);

                    if (graph.settings.showNodeLabels) {
                        node.append("text")
                            .attr("dx", 10)
                            .attr("dy", ".35em")
                            .text(function (d) {
                                return !d.hideLabel ? d.name : ""
                            });
                    }

                    if (!graph.settings.clustered && graph.settings.showEdgeLabels) {
                        var edgepaths = svg.selectAll(".edgepath")
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

                        var edgelabels = svg.selectAll(".edgelabel")
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

                    var circle = svg.selectAll("circle");

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
                            var cluster = clusters[d.group];
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
                                        r = d.radius + quad.point.radius + (d.group === quad.point.group ? graph.settings.clusterSettings.padding : graph.settings.clusterSettings.clusterPadding);
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
                };
            }
        };
    }]);