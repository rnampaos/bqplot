/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"));
import * as _ from 'underscore';
import * as lines from './Lines';

export const FlexLine = lines.Lines.extend({

    render: function() {
        var base_render_promise = lines.Lines.__super__.render.apply(this);
        var that = this;

        return base_render_promise.then(function() {
            that.create_listeners();
            that.draw();
        });
    },

    set_ranges: function() {
        FlexLine.__super__.set_ranges.apply(this);
        var width_scale = this.scales.width;
        if(width_scale) {
            width_scale.set_range([0.5, this.model.get("stroke_width")]);
        }
    },

    create_listeners: function() {
        FlexLine.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:colors", this.update_colors, this);
        this.listenTo(this.model, "change:labels_visibility", this.update_legend_labels, this);
        this.listenTo(this.model, "change:color change:width", this.update_and_draw, this);
    },

    draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        var g_elements = elem.selectAll(".legend" + this.uuid)
            .data(this.model.mark_data, function(d, i) { return d.name; });

        var that = this;
        var rect_dim = inter_y_disp * 0.8;
        g_elements.enter().append("g")
            .attr("class", "legend" + this.uuid)
            .attr("transform", function(d, i) {
                return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
            }).on("mouseover", _.bind(this.make_axis_bold, this))
            .on("mouseout", _.bind(this.make_axis_non_bold, this))
        .append("line")
            .style("stroke", function(d,i) { return that.get_colors(i); })
            .attr("x1", 0)
            .attr("x2", rect_dim)
            .attr("y1", rect_dim / 2)
            .attr("y2", rect_dim / 2);

        g_elements.append("text")
            .attr("class","legendtext")
            .attr("x", rect_dim * 1.2)
            .attr("y", rect_dim / 2)
            .attr("dy", "0.35em")
            .text(function(d, i) {return that.model.get("labels")[i]; })
            .style("fill", function(d,i) { return that.get_colors(i); });
        var max_length = d3.max(this.model.get("labels"), function(d: any[]) {
            return d.length;
        });

        g_elements.exit().remove();
        return [this.model.mark_data.length, max_length];
    },

    set_positional_scales: function() {
        var x_scale = this.scales.x, y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    },

    initialize_additional_scales: function() {
        var color_scale = this.scales.color;
        if(color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                this.draw();
            });
            color_scale.on("color_scale_range_changed", this.draw, this);
        }
    },

    draw: function() {
        this.set_ranges();
        var curves_sel = this.d3el.selectAll(".curve")
            .data(this.model.mark_data, function(d, i) { return d.name; });

        curves_sel.exit()
            .transition("draw")
            .duration(this.parent.model.get("animation_duration"))
            .remove();

        curves_sel = curves_sel.enter().append("g")
            .attr("class", "curve")
            .merge(curves_sel);

        var x_scale = this.scales.x, y_scale = this.scales.y;

        var that = this;
        curves_sel.nodes().forEach(function(elem, index) {
            var lines = d3.select(elem).selectAll<SVGLineElement, undefined>("line")
                .data(that.model.mark_data[index].values);
            lines = lines.enter().append("line").merge(lines);
            lines.attr("class", "line-elem")
                .attr("x1", function(d: any) { return x_scale.scale(d.x1); })
                .attr("x2", function(d: any) { return x_scale.scale(d.x2); })
                .attr("y1", function(d: any) { return y_scale.scale(d.y1); })
                .attr("y2", function(d: any) { return y_scale.scale(d.y2); })
                .attr("stroke", function(d) { return that.get_element_color(d); })
                .attr("stroke-width", function(d) { return that.get_element_width(d); });
        });
    },

    get_element_color: function(d) {
        var color_scale = this.scales.color;
        if(color_scale !== undefined && d.color !== undefined) {
            return color_scale.scale(d.color);
        }
        return this.model.get("colors")[0];
    },

    get_element_width: function(d) {
        var width_scale = this.scales.width;
        if(width_scale !== undefined && d.size !== undefined) {
            return width_scale.scale(d.size);
        }
        return this.model.get("stroke_width");
    },

    relayout: function() {
        lines.Lines.__super__.relayout.apply(this);
        this.set_ranges();

        var x_scale = this.scales.x, y_scale = this.scales.y;

        this.d3el.selectAll(".curve").selectAll(".line-elem")
            .transition("relayout")
            .duration(this.parent.model.get("animation_duration"))
            .attr("x1", function(d) { return x_scale.scale(d.x1); })
            .attr("x2", function(d) { return x_scale.scale(d.x2); })
            .attr("y1", function(d) { return y_scale.scale(d.y1); })
            .attr("y2", function(d) { return y_scale.scale(d.y2); });
    },

    create_labels: function() {
        //do nothing
    }
});