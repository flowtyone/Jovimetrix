/**
 * File: widget_vector.js
 * Project: Jovimetrix
 */

import { app } from "../../../scripts/app.js"
import { node_cleanup } from '../util/util.js'
import { CONVERTED_TYPE, convertToInput } from '../util/util_widget.js'
import { inner_value_change } from '../util/util_dom.js'
import { hex2rgb, rgb2hex } from '../util/util_color.js'
import { $el } from "../../../scripts/ui.js"

export const VectorWidget = (app, inputName, options, initial, desc='') => {
    const values = options[1]?.default || initial;
    const widget = {
        name: inputName,
        type: options[0],
        y: 0,
        value: values,
        options: options[1]
    }

    let isDragging;
    const precision = widget.options?.precision !== undefined ? widget.options.precision : 0;
    let step = options[0].includes(['VEC', 'vec']) ? 0.01 : 1;
    widget.options.step = widget.options?.step || step;
    widget.options.rgb = widget.options?.rgb || false;

    const offset_y = 5;
    const widget_padding_left = 15;
    const widget_padding = 30;
    const label_full = 72;
    const label_center = label_full/2;
    let picker;

    widget.draw = function(ctx, node, width, Y, height) {
        if (this.type !== options[0] && app.canvas.ds.scale > 0.5) return

        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = 2
        ctx.fillStyle = LiteGraph.WIDGET_OUTLINE_COLOR
        ctx.roundRect(widget_padding_left, Y, width - widget_padding, height, 16)
        ctx.stroke()
        ctx.lineWidth = 1
        ctx.fillStyle = LiteGraph.WIDGET_BGCOLOR
        ctx.roundRect(widget_padding_left, Y, width - widget_padding, height, 16)
        ctx.fill()

        // label
        ctx.fillStyle = LiteGraph.WIDGET_SECONDARY_TEXT_COLOR
        ctx.fillText(inputName, label_center - (inputName.length * 2.5), Y + height/2 + offset_y)
        let x = label_full

        const fields = Object.keys(this?.value || []);
        let count = fields.length;
        if (widget.options.rgb) {
            count += 0.23;
        }
        const element_width = (width - label_full - widget_padding) / count;
        const element_width2 = element_width/2;

        let converted = [];
        for (const idx of fields) {
            ctx.save()
            ctx.beginPath()
            ctx.fillStyle = LiteGraph.WIDGET_OUTLINE_COLOR
            // separation bar
            if (idx != fields.length || (idx == fields.length && !this.options.rgb)) {
                ctx.moveTo(x, Y)
                ctx.lineTo(x, Y+height)
                ctx.stroke();
            }

            // value
            ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR
            const it = this.value[idx.toString()]
            const value = Number(it).toFixed(Math.min(2, precision))
            converted.push(value);
            const text = value.toString()
            ctx.fillText(text, x + element_width2 - text.length * 3.25, Y + height/2 + offset_y)
            ctx.restore()
            x += element_width
        }

        if (this.options.rgb) {
            try {
                ctx.fillStyle = rgb2hex(converted);
            } catch (e) {
                ctx.fillStyle = "#000"
            }
            ctx.roundRect(width - 1.15 * widget_padding, Y, 0.65 * widget_padding, height, 16)
            ctx.fill()
        }
        ctx.restore()
    }

    function clamp(w, v, idx) {
        if (w.options?.max !== undefined) {
            v = Math.min(v, w.options.max)
        }
        if (w.options?.min !== undefined) {
            v = Math.max(v, w.options.min)
        }
        w.value[idx] = (precision == 0) ? Number(v) : parseFloat(v).toFixed(precision)
    }

    widget.mouse = function (e, pos, node) {
        let delta = 0;
        if (e.type === 'pointerdown') {
            if (isDragging === undefined) {
                const x = pos[0] - label_full
                const size = Object.keys(this.value).length
                const element_width = (node.size[0] - label_full - widget_padding * 1.25) / size
                const index = Math.floor(x / element_width)
                if (index >= 0 && index < size) {
                    isDragging = { name: this.name, idx: index}
                } else if (this.options.rgb) {
                    const rgba = Object.values(this?.value || []);
                    let color = rgb2hex(rgba.slice(0, 3));
                    if (index == size) {
                        if (!picker) {
                            picker = $el("input", {
                                type: "color",
                                parent: document.body,
                                style: {
                                    display: "none",
                                },
                            });
                            picker.onchange = () => {
                                if (picker.value) {
                                    this.value = hex2rgb(picker.value);
                                    if (rgba.length > 3) {
                                        this.value.push(rgba[3])
                                    }
                                }
                            };
                        }
                        picker.value = color;
                        picker.click();
                    } else if (x < 0 && rgba.length > 2) {
                        const target = Object.values(rgba.map(item => 255 - item)).slice(0, 3);
                        this.value = Object.values(this.value);
                        this.value.splice(0, 3, ...target);
                    }
                }
            }
        }

        if (isDragging !== undefined && isDragging.idx > -1 && isDragging.name === this.name) {
            const idx = isDragging.idx
            const old_value = { ...this.value };
            if (e.type === 'pointermove' && e.deltaX) {
                let v = parseFloat(this.value[idx])
                v += this.options.step * Math.sign(e.deltaX)
                clamp(this, v, idx)
            } else if (e.type === 'pointerup') {
                if (e.click_time < 200 && delta == 0) {
                    const label = this.options?.label ? this.name + '➖' + this.options.label?.[idx] : this.name;
                    LGraphCanvas.active_canvas.prompt(label, this.value[idx], function(v) {
                        if (/^[0-9+\-*/()\s]+|\d+\.\d+$/.test(v)) {
                            try {
                                v = eval(v);
                            } catch (e) {}
                        }
                        if (this.value[idx] != v) {
                            setTimeout(
                                function () {
                                    clamp(this, v, idx)
                                    inner_value_change(this, this.value, e)
                                }.bind(this), 20)
                        }
                    }.bind(this), e);
                }

                if (old_value != this.value) {
                    setTimeout(
                        function () {
                            //clamp(this, this.value[idx] || 0, idx)
                            inner_value_change(this, this.value, e)
                        }.bind(this), 20)
                }
                isDragging = undefined
                app.canvas.setDirty(true)
            }
        }
    }

    widget.computeSize = function (width) {
        return [width, LiteGraph.NODE_WIDGET_HEIGHT]
    }

    widget.serializeValue = async () => {
        if (typeof widget.value === 'object' && widget.value !== null && !Array.isArray(widget.value)) {
            // Check if widget.value is a dictionary
            return widget.value;
        }
        return widget.value.reduce((acc, tuple, index) => ({ ...acc, [index]: tuple }), {});
    }

    widget.desc = desc
    return widget
}

app.registerExtension({
    name: "jovimetrix.widget.spinner",
    async getCustomWidgets(app) {
        return {
            VEC2: (node, inputName, inputData, app) => ({
                widget: node.addCustomWidget(VectorWidget(app, inputName, inputData, [0, 0])),
            }),
            VEC3: (node, inputName, inputData, app) => ({
                widget: node.addCustomWidget(VectorWidget(app, inputName, inputData, [0, 0, 0])),
            }),
            VEC4: (node, inputName, inputData, app) => ({
                widget: node.addCustomWidget(VectorWidget(app, inputName, inputData, [0, 0, 0, 1])),
            })
        }
    },
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // export const myTypes = ['RGB', 'VEC2', 'VEC2', 'VEC3', 'VEC4', 'INT3', 'INT4', 'INT2']
        const myTypes = ['RGB', 'VEC2', 'VEC3', 'VEC4']
        const inputTypes = nodeData.input;
        if (inputTypes) {
            const matchingTypes = ['required', 'optional']
                .flatMap(type => Object.entries(inputTypes[type] || [])
                    .filter(([_, value]) => myTypes.includes(value[0]))
                );

            // CLEANUP ON REMOVE
            if (matchingTypes.length > 0) {
                const onNodeCreated = nodeType.prototype.onNodeCreated;
                nodeType.prototype.onNodeCreated = function () {
                    const me = onNodeCreated?.apply(this, arguments);
                    this.onRemoved = function () {
                        node_cleanup(this);
                    };
                    return me;
                };

                // MENU CONVERSIONS
                const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
                nodeType.prototype.getExtraMenuOptions = function (_, options) {
                    const me = getExtraMenuOptions?.apply(this, arguments);
                    const convertToInputArray = [];
                    for (const w of matchingTypes) {
                        const widget = Object.values(this.widgets).find(m => m.name === w[0]);
                        if (widget.type !== CONVERTED_TYPE && myTypes.includes(widget.type)) {
                            const who = matchingTypes.find(w => w[0] === widget.name)
                            const convertToInputObject = {
                                content: `Convert ${widget.name} to input`,
                                callback: () => convertToInput(this, widget, who[1])
                            };
                            convertToInputArray.push(convertToInputObject);
                        }
                    }
                    //const toInput = convertToInputArray;
                    if (convertToInputArray.length) {
                        options.push(...convertToInputArray, null);
                    }
                    return me;
                };
            }
        }
    }
})
