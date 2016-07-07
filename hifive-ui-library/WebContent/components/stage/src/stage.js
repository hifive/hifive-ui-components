/*
 * Copyright (C) 2012-2016 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function($) {
	'use strict';

	var RootClass = h5.cls.RootClass;


	//クラスとして作ったものを変える
	//	RootClass.extend(function() {
	//		var desc = {
	//			name: 'h5.ui.components.stage.DragSessionController',
	//			method: {
	//				constructor: function DragSessionController() {
	//					DragSessionController._super.call(this);
	//				}
	//			}
	//		};
	//		return desc;
	//	});


	/**
	 * 指定された範囲内の値を返す。min,maxの値は含む(value > maxの場合、返る値はmax)。<br>
	 * min,maxにnullを指定した場合はその方向の上/下限は無視する。<br>
	 *
	 * @private
	 * @param value 値
	 * @param min 最小値(nullの場合は無視)
	 * @param max 最大値(nullの場合は無視)
	 * @returns クランプされた値
	 */
	function clamp(value, min, max) {
		if (min != null && value < min) {
			return min;
		}
		if (max != null && value > max) {
			return max;
		}
		return value;
	}

	h5.u.obj.expose('h5.ui.components.stage.StageUtil', {
		clamp: clamp
	});

	/**
	 * DragSession
	 * <p>
	 * 図形(Shapeクラス)のドラッグ操作を行うためのクラスです。コンストラクタで渡された図形についてのドラッグ操作を管理します。
	 * </p>
	 *
	 * @class
	 * @name DragSession
	 * @returns クラス定義
	 */
	RootClass.extend(function() {
		// TODO 1つのShapeについて1つのDragSessionしか同時に実行できないように
		// staticなマップで管理する

		var DRAG_MODE_SELF = 'self';


		var desc = {
			name: 'h5.ui.components.stage.DragSession',
			field: {
				/**
				 * ドラッグ操作対象オブジェクト
				 */
				_target: null,
				_startX: null,
				_startY: null,
				_moveX: null,
				_moveY: null,
				_isCompleted: null,
				_dragMode: null,
				_controller: null,
				_dragCallbacks: null
			},
			property: {
				isCompleted: {
					get: function() {
						return this._isCompleted;
					}
				}
			},
			method: {
				constructor: function DragSession(target, dragMode) {
					DragSession._super.call(this);

					this._isCompleted = false;

					this._dragCallbacks = [];

					//this._target = target;

					//TODO byProxyか、オブジェクトをそのまま動かすかをdragModeで指定できるようにする
					// proxy, selfのどちらか
					//this._dragMode = DRAG_MODE_SELF; //dragMode;

					//DOMならtop, left, SVGならx,yかtranslateか
					//DUの場合はx,y
					//this._startX = target.x;
					//this._startY = target.y;

					this._moveDx = 0;
					this._moveDy = 0;

					this._moveX = 0;
					this._moveY = 0;
				},

				/**
				 * 指定された位置に移動
				 * <p>
				 * このメソッドを使って図形を移動すると、見た目の位置のみが変化します。図形(ArtShape)のmoveToやmoveByは呼ばれません。
				 * ユーザによるドラッグ操作等の、移動先が未確定の場合の図形の移動のためのメソッドです。
				 * </p>
				 * <p>
				 * このメソッドで移動した位置に、図形の位置を確定させたい場合は、endを呼んでください。
				 * </p>
				 * <p>
				 * 引数にはドラッグセッション開始位置からの移動量(x,y)を指定します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @param {number} x
				 * @param {number} y
				 */
				moveTo: function(x, y) {

					var dxTotal = x - this._moveX;
					var dyTotal = y - this._moveY;

					//					this._

					this._moveX = x;
					this._moveY = y;

				},

				moveBy: function(dx, dy) {
					var x = this._moveX + dx;
					var y = this._moveY + dy;
					this.moveTo(x, y);
				},

				/**
				 * ドラッグセッションを終了して位置を確定させる
				 * <p>
				 * moveメソッドを使って移動させた位置で、図形の位置を確定します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @returns {DragSession}
				 */
				complete: function() {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					this._controller.dispose();
				},

				/**
				 * ドラッグセッションを終了して位置を元に戻す
				 * <p>
				 * moveメソッドで移動させた処理を元に戻します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @returns {DragSession}
				 */
				cancel: function() {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					if (this._dragMode === DRAG_MODE_SELF) {
						this._target.moveTo(this._startX, this._startY);
					}

					this._controller.dispose();
				},

				addDragCallback: function(func) {
					this._dragCallbacks.push(func);
				},

				_onMove: function(dx, dy) {
					var callbacks = this._dragCallbacks;
					for (var i = 0, len = callbacks.length; i < len; i++) {
						var f = callbacks[i];
						f(this, dx, dy);
					}
				}
			}
		};
		return desc;
	});


	var DragSession = h5.cls.manager.getClass('h5.ui.components.stage.DragSession');

	var dragController = {
		/**
		 * @memberOf h5.ui.components.stage.DragController
		 */
		__name: 'h5.ui.components.stage.DragController',

		_dragSession: null,

		getDragSession: function() {
			return this._dragSession;
		},

		'{rootElement} h5trackstart': function(context) {
			this._dragSession = DragSession.create();
			//TODO DragStartイベントの出し方
			this.trigger('dgDragStart', {
				dragSession: this._dragSession
			});
		},

		'{rootElement} h5trackmove': function(context) {
			if (!this._dragSession || this._dragSession.isCompleted) {
				return;
			}

			var ev = context.event;
			var dx = ev.dx;
			var dy = ev.dy;
			this._dragSession._onMove(dx, dy);
		},

		'{rootElement} h5trackend': function(context) {
			if (!this._dragSession || this._dragSession.isCompleted) {
				return;
			}

			var ds = this._dragSession;

			ds.complete();

			this._dragSession = null;

			//TODO dragSessionを渡すべきか？
			this.trigger('dgDragEnd', {
				dragSession: ds
			});
		}
	};

	h5.core.expose(dragController);

	var dragSessionController = {
		/**
		 * @memberOf h5.ui.components.stage.DragSessionController_TOBEDELETED
		 */
		__name: 'h5.ui.components.stage.DragSessionController',

		_dragSession: null,

		setDragSession: function(dragSession) {
			this._dragSession = dragSession;
		},

		'{rootElement} h5trackstart': function(context) {
		//ignore
		},

		'{rootElement} h5trackmove': function(context) {
			var ev = context.event;
			var dx = ev.dx;
			var dy = ev.dy;
			this._dragSession._onMove(dx, dy);
		},

		'{rootElement} h5trackend': function(context) {
			this._dragSession.complete();
		}
	};


	var Rect = RootClass
			.extend(function() {
				var desc = {
					name: 'h5.ui.components.stage.Rect',
					field: {
						_x: null,
						_y: null
					},
					accessor: {
						x: {
							get: function() {
								return this._x;
							},
							set: function(value) {
								this._x = value;
							}
						},
						y: {
							get: function() {
								return this._y;
							},
							set: function(value) {
								this._y = value;
							}
						},
						width: null, //TODO 実験用にwidth,heightは _p_width のままにしている
						height: null
					},
					method: {
						/**
						 * @memberOf h5.ui.components.stage.Rect
						 */
						constructor: function Rect(x, y, width, height) {
							Rect._super.call(this);
							this._x = x !== undefined ? x : 0;
							this._y = y !== undefined ? y : 0;
							this._p_width = width !== undefined ? width : 0;
							this._p_height = height !== undefined ? height : 0;
						},
						setRect: function(x, y, width, height) {
							if (x != null) {
								this._x = x;
							}
							if (y != null) {
								this._y = y;
							}
							if (width != null) {
								this.width = width;
							}
							if (height != null) {
								this.height = height;
							}
						},

						setLocation: function(x, y) {
							if (x != null) {
								this._x = x;
							}
							if (y != null) {
								this._y = y;
							}
						},

						setSize: function(width, height) {
							if (width != null) {
								this.width = width;
							}
							if (height != null) {
								this.height = height;
							}
						},

						/**
						 * 引数のrectが表す領域を、このRectが表す領域が完全に含んでいるかどうかを返します。部分的にのみ含んでいる場合はfalseです。
						 *
						 * @param rect
						 */
						contains: function(rect) {
							if (rect.x >= this.x && (rect.x + rect.width) <= (this.x + this.width)
									&& rect.y >= this.y
									&& (rect.y + rect.height) <= (this.y + this.height)) {
								return true;
							}
							return false;
						}
					}
				};
				return desc;
			});


	var Point = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Point',
			field: {
				x: null,
				y: null
			},
			method: {
				constructor: function Point(x, y) {
					Point._super.call(this);
					this.x = x;
					this.y = y;
				}
			}
		};
		return desc;
	});

	var WorldPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.WorldPoint',
			method: {
				constructor: function WorldPoint(x, y) {
					WorldPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	var DisplayPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.DisplayPoint',
			method: {
				constructor: function DisplayPoint(x, y) {
					DisplayPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	//TODO 削除予定
	function isHifiveClass(target) {
		return target && typeof target.getFullName === 'function'
				&& typeof target.getParentClass === 'function';
	}

	function setSvgAttribute(element, key, value) {
		setAttributeNS(element, null, key, value);
	}

	function setAttributeNS(element, ns, key, value) {
		if (value && value.isDefinition && value.definitionUrl) {
			element.setAttributeNS(ns, key, value.definitionUrl);
			return;
		}
		element.setAttributeNS(ns, key, value);
	}

	function setSvgAttributes(element, param) {
		for ( var key in param) {
			setSvgAttribute(element, key, param[key]);
		}
	}

	function removeAttributeNS(element, ns, key) {
		element.removeAttributeNS(ns, key);
	}

	function removeSvgAttribute(element, key) {
		removeAttributeNS(null, element, key);
	}

	function removeSvgAttributes(element, keys) {
		for (var i = 0; i < keys.length; i++) {
			removeSvgAttribute(element, key[i]);
		}
	}

	var SvgUtil = {
		createSvgElement: createSvgElement,
		setSvgAttribute: setSvgAttribute,
		setSvgAttributes: setSvgAttributes,
		removeSvgAttribute: removeSvgAttribute,
		removeSvgAttributes: removeSvgAttributes
	};
	h5.u.obj.expose('h5.ui.components.stage', {
		SvgUtil: SvgUtil
	});

	var NS_XLINK = "http://www.w3.org/1999/xlink";

	//TODO 本当はSVGDrawElementのfuncの中に入れたいが
	//Eclipseのフォーマッタと相性が悪い。いずれ方法を検討。
	var ERR_MUST_OVERRIDE_RENDER_FUNCTION = 'SVGDrawElementのrenderメソッドは、その子クラスで必ずオーバーライドする必要があります。';

	var SVGElementWrapper = RootClass.extend(function() {

		function getChangedAttributes() {
			return {
				changed: new Map(),
				removed: new Map(),
				addChanged: function(name, ns) {
					if (!this.changed.has(name)) {
						this.changed.set(name, {
							name: name,
							ns: ns
						});
					}
					this.removed['delete'](name);
				},
				addRemoved: function(name, ns) {
					if (!this.removed.has(name)) {
						this.removed.set(name, {
							name: name,
							ns: ns
						});
					}
					this.changed['delete'](name);
				},
				removeEntry: function(name) {
					this.changed['delete'](name);
					this.removed['delete'](name);
				}
			};
		}

		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGElementWrapper
			 */
			name: 'h5.ui.components.stage.SVGElementWrapper',
			field: {
				_element: null,
				_graphics: null,

				_isDefinition: null,
				_classes: null,
				_attributes: null,
				_changedAttributes: null
			},
			accessor: {
				isDefinition: {
					get: function() {
						return this._isDefinition;
					}
				},
				definitionUrl: {
					get: function() {
						var id = this.id;
						return this.isDefinition && id ? 'url(#' + this.id + ')' : null;
					}
				},
				id: {
					get: function() {
						return this.getAttribute('id');
					}
				}
			},
			method: {
				constructor: function SVGElementWrapper(graphics, element, id) {
					SVGElementWrapper._super.call(this);
					this._element = element;
					this._graphics = graphics;

					this._isDefinition = false;
					this._classes = [];
					this._attributes = new Map();
					this._changedAttributes = getChangedAttributes();

					if (id) {
						this._setAttribute('id', id, true);
					}
				},
				requestRender: function() {
					if (this._graphics) {
						this._graphics._addToRenderWaitingList(this);
					} else {
						//graphicsに属していない場合は直ちに描画する
						this.render();
					}
				},
				render: function() {
					throw new Error(ERR_MUST_OVERRIDE_RENDER_FUNCTION);
				},
				getAttribute: function(key) {
					return this._attributes.has(key) ? this._attributes.get(key) : null;
				},
				getXLinkAttribute: function(key) {
					return this.getAttribute(key);
				},
				setAttribute: function(key, value) {
					this._setAttribute(key, value, this.isDefinition);
				},
				setAttributes: function(param) {
					this._setAttributes(param, this.isDefinition);
				},
				setXLinkAttribute: function(key, value) {
					this._setXLinkAttribute(key, value, this.isDefinition);
				},
				setXLinkAttributes: function(param) {
					this._setXLinkAttributes(param, this.isDefinition);
				},
				_setAttribute: function(key, value, sync) {
					this._setAttributeNS(null, key, value, sync);
				},
				_setAttributes: function(param, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setAttribute(key, param[key], sync);
						}
					}
				},
				_setXLinkAttribute: function(key, value, sync) {
					this._setAttributeNS(NS_XLINK, key, value, sync);
				},
				_setXLinkAttributes: function(params, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setXLinkAttribute(key, param[key], sync);
						}
					}
				},
				_setAttributeNS: function(ns, key, value, sync) {
					if (value === null) {
						this.removeAttribute(key);
						return;
					}

					if (this._attributes.get(key) === value) {
						return;
					}

					this._attributes.set(key, value);
					if (sync) {
						this._changedAttributes.removeEntry(key);
						setAttributeNS(this._element, ns, key, value);
					} else {
						this._changedAttributes.addChanged(key, ns);
						this.requestRender();
					}
				},
				removeAttribute: function(key, sync) {
					this._removeAttributeNS(null, key, sync);
				},
				removeXLinkAttribute: function(key, sync) {
					this._removeAttributeNS(NS_XLINK, key, sync);
				},
				_removeAttributeNS: function(ns, key, sync) {
					// FIXME deleteがエラーとして表示される
					if (!this._attributes.has(key)) {
						return;
					}

					this._attributes['delete'](key);
					if (sync) {
						this._changedAttributes.removeEntry(key);
						removeAttributeNS(this._element, ns, key);
					} else {
						this._changedAttributes.addRemoved(key, ns);
						this.requestRender();
					}
				},
				removeAttributes: function(keys, sync) {
					for (var i = 0; i < keys.length; i++) {
						this.removeAttribute(keys[i], sync);
					}
				},
				addClass: function(className, sync) {
					for (var i = 0; i < this._classes.length; i++) {
						if (this._classes[i] === className) {
							return;
						}
					}
					this._classes.push(className);
					this.setAttribute('class', this._classes.join(' '), sync);
				},
				removeClass: function(className, sync) {
					for (var i = 0; i < this._classes.length; i++) {
						if (this._classes[i] === className) {
							this._classes.splice(i, 1);
							this.setAttribute('class', this._classes.join(' '), sync);
							break;
						}
					}
				},
				_renderChangedAttributes: function() {
					// Delete removed attributes
					var attrChanged = false;
					var element = this._element;
					var removed = this._changedAttributes.removed;
					if (removed.size) {
						removed.forEach(function(value, key) {
							removeAttributeNS(element, value.ns, key);
						});
						removed.clear();
						attrChanged = true;
					}

					var changed = this._changedAttributes.changed;
					if (changed.size) {
						var attributes = this._attributes;
						changed.forEach(function(value, key) {
							setAttributeNS(element, value.ns, key, attributes.get(key));
						});
						changed.clear();
						attrChanged = true;
					}

					return attrChanged;
				}
			}
		};
		return desc;
	});

	var SVGDrawElement = SVGElementWrapper.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGDrawElement',
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGDrawElement
				 */
				constructor: function SVGDrawElement(graphics, element, id) {
					SVGDrawElement._super.call(this, graphics, element, id);
				}
			}
		};
		return desc;
	});

	/**
	 * @param {Object} target
	 * @param {string[]} attrNames
	 */
	function addSimpleSVGAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attrName) {
				return {
					get: function() {
						return this.getAttribute(attrName);
					},
					set: function(value) {
						this.setAttribute(attrName, value);
					}
				};
			})(attrName);
		}
	}

	/**
	 * @param {Object} target
	 * @param {string[]} attrNames
	 */
	function addSimpleXLinkAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attrName) {
				return {
					get: function() {
						return this.getXLinkAttribute(attrName);
					},
					set: function(value) {
						this.setXLinkAttribute(attrName, value);
					}
				}
			})(attrName);
		}
	}

	var SVGLine = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGLine',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGLine
				 */
				constructor: function SVGLine(graphics, element) {
					SVGLine._super.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x1', 'x2', 'y1', 'y2', 'stroke', 'stroke-width',
				'fill']);
		return desc;
	});

	var SVGText = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGText',
			field: {
				_textContent: null,
				_text: null
			},
			accessor: {
				dominantBaseline: {
					get: function() {
						return this.getAttribute('dominant-baseline');
					},
					set: function(value) {
						switch (value) {
						case 'auto':
						case 'alphabetic':
						case 'text-before-edge':
						case 'central':
						case 'text-after-edge':
							this.setAttribute('dominant-baseline', value);
							break;
						}
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGText
				 */
				constructor: function SVGText(graphics, element) {
					SVGText._super.call(this, graphics, element);
					this._textContent = this._text = null;
				},
				render: function() {
					var changed = this._renderChangedAttributes();

					if (this._text) {
						this._element.textContent = this._textContent = this._text;
						this._text = null;
						changed = true;
					}

					if (!changed) {
						return;
					}

					// IEのdominant-baselineハック
					// TODO translate実装時に、位置を修正する必要がある
					if (!h5.env.ua.isIE) {
						return;
					}

					var dominantBaseline = this.dominantBaseline;
					var dy = 0;
					if (dominantBaseline && dominantBaseline !== 'auto'
							&& dominantBaseline !== 'alphabetic') {
						var y = this.y || 0; // TODO y座標が数字以外の場合
						var bbox = this._element.getBBox();

						switch (dominantBaseline) {
						case 'text-before-edge':
							dy = y - bbox.y;
							break;
						case 'text-after-edge':
							dy = y - bbox.y - bbox.height;
							break;
						case 'central':
							dy = y - bbox.y - bbox.height / 2;
							break;
						}
					}

					this._setAttribute('transform', 'translate(0, ' + dy + ')', true);
				},
				setText: function(text) {
					if (this._textContent !== text) {
						this._text = text;
						this.requestRender();
					}
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-family',
				'font-size', 'font-weight', 'fill', 'rotate']);
		return desc;
	});

	var SVGRect = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGRect',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGRect
				 */
				constructor: function SVGRect(graphics, element) {
					SVGRect._super.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'width', 'height', 'stroke', 'stroke-width',
				'fill', 'rx', 'ry']);
		return desc;
	});

	var SVGCircle = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGCircle',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGCircle
				 */
				constructor: function SVGCircle(graphics, element) {
					SVGCircle._super.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['cx', 'cy', 'r', 'stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGTriangle = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGTriangle',
			field: {
				_topX: null,
				_topY: null,
				_width: null,
				_height: null,
				_direction: null
			},
			accessor: {
				topX: {
					get: function() {
						return this._topX;
					},
					set: function(value) {
						this._topX = value;
						this.requestRender();
					}
				},
				topY: {
					get: function() {
						return this._topY;
					},
					set: function(value) {
						this._topY = value;
						this.requestRender();
					}
				},
				width: {
					get: function() {
						return this._width;
					},
					set: function(value) {
						this._width = value;
						this.requestRender();
					}
				},
				height: {
					get: function() {
						return this._height;
					},
					set: function(value) {
						this._height = value;
						this.requestRender();
					}
				},
				direction: {
					get: function() {
						return this._direction;
					},
					set: function(value) {
						this._direction = value;
						this.requestRender();
					}
				}
			},
			method: {
				constructor: function SVGTriangle(graphics, element) {
					SVGTriangle._super.call(this, graphics, element);
					this._topX = 0;
					this._topY = 0;
					this._width = 0;
					this._height = 0;
					this._direction = 'up';
				},
				render: function() {
					this._renderChangedAttributes();
					this._renderTriangle();
				},
				_renderTriangle: function() {
					var width = this.width;
					var height = this.height;

					// 三角形が大きさを持たない場合
					if (!width || !height) {
						this.removeAttribute('d', true);
						return;
					}

					var topX = this.topX;
					var topY = this.topY;
					var direction = this.direction;
					var d;
					if (typeof direction === 'number') {
						d = direction;
					} else {
						switch (direction) {
						case 'up':
							d = 0;
							break;

						case 'left':
							d = 90;
							break;

						case 'down':
							d = 180;
							break;

						case 'right':
							d = 270;
							break;

						default:
							d = 0;
						}
					}

					d = ((d + 270) % 360) * Math.PI / 180;

					// 頂点から底辺に直角に伸びる直線と底辺との交差点（底辺の中心）
					var x1 = topX + height * Math.cos(d + Math.PI);
					var y1 = topY + height * Math.sin(d + Math.PI);

					// 底辺の中心から底辺の頂点へのそれぞれの軸方向の差分
					var dx = width / 2 * Math.cos(d + Math.PI / 2);
					var dy = width / 2 * Math.sin(d + Math.PI / 2);

					var path = '';
					path += ' M' + (x1 + dx) + ',' + (y1 + dy);
					path += ' L' + (x1 - dx) + ',' + (y1 - dy);
					path += ' L' + topX + ',' + topY;
					path += ' Z';

					this._setAttribute('d', path, true);
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGImage = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGImage',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGImage
				 */
				constructor: function SVGImage(graphics, element) {
					SVGImage._super.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'width', 'height', 'preserveAspectRatio']);
		addSimpleXLinkAccessor(desc.accessor, ['href']);
		return desc;
	});

	var SVGDefinitions = SVGElementWrapper.extend(function() {
		// TODO SVGDefinitionsに追加するWrapperはidプロパティを持つ必要がある
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGDefinitions
			 */
			name: 'h5.ui.components.stage.SVGDefinitions',
			field: {
				_definitions: null
			},
			method: {
				constructor: function SVGDefinitions(element) {
					SVGDefinitions._super.call(this);
					this._element = element;
					this._definitions = new Map();
				},
				get: function(id) {
					return this._definitions.has(id) ? this._definitions.get(id) : null;
				},
				has: function(target) {
					var id = this._getId(target);
					return id === null ? false : this._definitions.get(id);
				},
				add: function(definition) {
					var id = this._getId(definition);
					if (id === null) {
						// TODO
						return;
					}

					this._definitions.set(id, definition);
					this._element.appendChild(definition._element);
				},
				remove: function(target) {
					var id = this._getId(target);
					if (id === null) {
						// TODO
						return;
					}

					var definition = this._definitions.get(id);
					if (!definition) {
						return;
					}
					this._element.removeChild(definition._element);
				},
				_getId: function(target) {
					if (typeof target === 'string') {
						return target;
					}
					var id = target.id;
					return id === undefined ? null : id;
				}
			}
		};
		return desc;
	});

	var SVGGradient = SVGElementWrapper.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGGradient
			 */
			name: 'h5.ui.components.stage.SVGGradient',
			field: {
				_stops: null
			},
			method: {
				constructor: function SVGGradient(element, id) {
					SVGGradient._super.call(this, null, element, id);
					this._isDefinition = true;
					this._stops = [];
				},
				addStop: function(offset, color, opacity) {
					var stop = createSvgElement('stop');
					if (offset !== undefined) {
						setSvgAttribute(stop, 'offset', offset);
					}
					if (color !== undefined) {
						setSvgAttribute(stop, 'stop-color', color);
					}
					if (opacity !== undefined) {
						setSvgAttribute(stop, 'stop-opacity', opacity);
					}

					this._element.appendChild(stop);
					this._stops.push({
						element: stop,
						offset: offset,
						color: color,
						opacity: opacity
					});
					return this;
				}
			}
		};
		return desc;
	});

	var SVGLinearGradient = SVGGradient.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGLinearGradient
			 */
			name: 'h5.ui.components.stage.SVGLinearGradient',
			accessor: {},
			method: {
				constructor: function SVGLinearGradient(element, id) {
					SVGLinearGradient._super.call(this, element, id);
				},
				from: function(x1, y1) {
					this.x1 = x1;
					this.y1 = y1;
					return this;
				},
				to: function(x2, y2) {
					this.x2 = x2;
					this.y2 = y2;
					return this;
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x1', 'y1', 'x2', 'y2', 'spreadMethod']);
		return desc;
	});

	var SVGRadialGradient = SVGGradient.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGRadialGradient
			 */
			name: 'h5.ui.components.stage.SVGRadialGradient',
			accessor: {},
			method: {
				constructor: function SVGRadialGradient(element, id) {
					SVGRadialGradient._super.call(this, element, id);
				},
				center: function(cx, cy) {
					this.cx = cx;
					this.cy = cy;
					return this;
				},
				radius: function(r) {
					this.r = r;
					return this;
				},
				focus: function(fx, fy) {
					this.fx = fx;
					this.fy = fy;
					return this;
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['cx', 'cy', 'r', 'fx', 'fy', 'spreadMethod']);
		return desc;
	});

	var SVGGraphics = RootClass.extend(function() {
		//TODO 仮実装
		var idSequence = 0;

		var ID_SEQ_PREFIX = 'def_';

		//TODO 仮実装、連番一意ID生成
		function createDefId() {
			return ID_SEQ_PREFIX + idSequence++;
		}

		var desc = {
			name: 'h5.ui.components.stage.SVGGraphics',
			field: {
				_rootSvg: null,
				_defs: null,
				_renderWaitingList: null
			},
			accessor: {
				isDirty: {
					get: function() {
						return this._renderWaitingList.length !== 0;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGGraphics
				 */
				constructor: function SVGGraphics(rootSvg, rootDefs) {
					SVGGraphics._super.call(this);
					this._rootSvg = rootSvg;
					this._defs = rootDefs;
					this._renderWaitingList = [];
				},

				_addDefinition: function(svgElementWrapper) {
					if (this._defs.has(svgElementWrapper)) {
						//TODO 同じIDを持つ要素が既にdefsにあったらエラーにする
						return;
					}

					this._defs.add(svgElementWrapper);
				},

				_removeDefinition: function(id) {
					this._defs.remove(id);
				},

				_addToRenderWaitingList: function(svgDrawElement) {
					if ($.inArray(svgDrawElement, this._renderWaitingList) === -1) {
						this._renderWaitingList.push(svgDrawElement);
					}
				},

				render: function() {
					var list = this._renderWaitingList;
					for (var i = 0, len = list.length; i < len; i++) {
						var drawElement = list[i];
						drawElement.render();
					}
					this._renderWaitingList = [];
				},

				getDefinition: function(id) {
					return this._defs.get(id);
				},

				createLinearGradient: function(id) {
					if (id === undefined) {
						id = createDefId();
					}

					var element = createSvgElement('linearGradient');
					var gradient = SVGLinearGradient.create(element, id);
					this._addDefinition(gradient);
					return gradient;
				},

				createRadialGradient: function(id) {
					if (id === undefined) {
						id = createDefId();
					}

					var element = createSvgElement('radialGradient');
					var gradient = SVGRadialGradient.create(element, id);
					this._addDefinition(gradient);
					return gradient;
				},

				clear: function() {
					//TODO clearもrender()のタイミングに遅延する？？

					while (this._rootSvg.firstChild) {
						this._rootSvg.removeChild(this._rootSvg.firstChild);
					}
					this._renderWaitingList = [];
					//TODO drawLineなどで作ったSVGDrawElementインスタンスから自分への参照を除去
				},

				drawImage: function() {
					var image = createSvgElement('image');
					this._rootSvg.appendChild(image);
					var de = SVGImage.create(this, image);
					return de;
				},

				drawLine: function() {
					var line = createSvgElement('line');
					this._rootSvg.appendChild(line);
					var sl = SVGLine.create(this, line);
					return sl;
				},
				drawRect: function() {
					var rect = createSvgElement('rect');
					this._rootSvg.appendChild(rect);
					var de = SVGRect.create(this, rect);
					return de;
				},
				drawCircle: function() {
					var circle = createSvgElement('circle');
					this._rootSvg.appendChild(circle);
					var de = SVGCircle.create(this, circle);
					return de;
				},
				drawText: function(str) {
					var text = createSvgElement('text');
					this._rootSvg.appendChild(text);
					var de = SVGText.create(this, text);

					if (str != null) {
						de.setText(str);
					}

					return de;
				},
				drawTriangle: function() {
					var path = createSvgElement('path');
					this._rootSvg.appendChild(path);
					var de = SVGTriangle.create(this, path);
					return de;
				}
			}
		};
		return desc;
	});

	var SimpleSet = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SimpleSet',
			field: {
				_keys: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SimpleSet
				 */
				constructor: function SimpleSet() {
					SimpleSet._super.call(this);
					this._keys = [];
				},
				add: function(key) {
					if (this.has(key)) {
						return;
					}
					this._keys.push(key);
				},
				remove: function(key) {
					var idx = $.inArray(key, this._keys);
					if (idx === -1) {
						//このタグは持っていない
						return;
					}
					this._keys.splice(idx, 1);
				},
				has: function(key) {
					return $.inArray(key, this._keys) !== -1;
				},
				clear: function() {
					this._keys = [];
				},
				size: function() {
					return this._keys.length;
				},
				toArray: function() {
					return this._keys.slice(0);
				},
			}
		};
		return desc;
	});

	var ERR_CANNOT_MOVE_OFFSTAGE_DU = 'Stageに追加されていないDisplayUnitはディスプレイ座標系に基づいた移動はできません。';

	//TODO layouter(仮)を差し込めるようにし、
	//layouterがいる場合にはx,y,w,hをセットしようとしたときに
	//layouterがフックして強制ブロック・別の値をセット等できるようにする
	var DisplayUnit = h5.cls.RootClass.extend(function() {
		var duIdSequence = 0;

		var classDesc = {
			name: 'h5.ui.components.stage.DisplayUnit',
			isAbstract: true,
			field: {
				id: null,

				//TODO privateなプロパティへの対応
				_parentDU: null,

				_rootStage: null,

				_groupTag: null
			},
			accessor: {
				x: null,
				y: null,
				width: null,
				height: null,
				domRoot: null,
				extraData: null,
				groupTag: {
					get: function() {
						return this._groupTag;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnit
				 */
				constructor: function DisplayUnit(id) {
					DisplayUnit._super.call(this);
					//TODO 引数のIDは必須にする？？
					if (id == null) {
						//TODO ただの連番でなくGUID等にする
						this.id = 'duid_' + duIdSequence;
						duIdSequence++;
					} else {
						//TODO IDが渡された場合は一意性チェックを入れたい(※ここではなく、StageにaddされるときにStage側が行う)
						this.id = id;
					}

					//TODO prop.defaultValueで
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._groupTag = SimpleSet.create();
				},

				setRect: function(rect) {
					this.x = rect.x;
					this.y = rect.y;
					this.width = rect.width;
					this.height = rect.height;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height
					});
				},

				getRect: function() {
					var rect = Rect.create(this.x, this.y, this.width, this.height);
					return rect;
				},

				remove: function() {
					if (this._parentDU) {
						this._parentDU.removeDisplayUnit(this);
					}
				},

				moveTo: function(x, y) {
					this.x = x;
					this.y = y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: x,
						y: y
					});
				},

				moveBy: function(x, y) {
					this.x += x;
					this.y += y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: this.x,
						y: this.y
					});
				},

				moveDisplayTo: function(x, y) {
					if (!this._rootStage) {
						throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
					}
					var worldPos = this._rootStage._viewport.getWorldPosition(x, y);
					this.moveTo(worldPos.x, worldPos.y);
				},

				moveDisplayBy: function(x, y) {
					if (!this._rootStage) {
						throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
					}
					var wx = this._rootStage._viewport.getXLengthOfWorld(x);
					var wy = this._rootStage._viewport.getYLengthOfWorld(y);
					this.moveBy(wx, wy);
				},

				scrollIntoView: function() {
				//TODO
				},

				getWorldGlobalPosition: function() {
					if (!this._parentDU) {
						return null;
					}

					var wgx = this.x;
					var wgy = this.y;

					var parentDU = this._parentDU;
					while (!Layer.isClassOf(parentDU)) {
						var parentPos = parentDU.getWorldGlobalPosition();
						wgx += parentPos.x;
						wgy += parentPos.y;
						parentDU = this._parentDU._parentDU;
					}

					var wpos = WorldPoint.create(wgx, wgy);
					return wpos;
				},

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
				}

			//				scrollIntoView: {
			//					func: function () {
			//
			//					},
			//					type: ['int', 'int']
			//				}
			}
		};

		return classDesc;
	});



	var BasicDisplayUnit = DisplayUnit.extend({
		name: 'h5.ui.components.stage.BasicDisplayUnit',
		field: {
			/**
			 * この要素を現在ドラッグ可能かどうか
			 */
			isDraggable: null,
			_graphics: null,
			_renderer: null,
			_isSelected: null,
			_isFocused: null,
			_rootSvg: null,

			/**
			 * この要素を現在選択可能かどうか
			 */
			_isSelectable: null
		},
		accessor: {
			isSelectable: {
				get: function() {
					return this._isSelectable;
				},
				set: function(value) {
					if (this._isSelectable === value) {
						return;
					}
					this._isSelectable = value;
					if (value === false) {
						//選択不能になったので、選択状態を解除
						this.unselect();
					}
				}
			},
			isSelected: {
				get: function() {
					return this._isSelected;
				}
			},
			isFocused: {
				get: function() {
					return this._isFocused;
				}
			}
		},
		method: {
			constructor: function BasicDisplayUnit(id) {
				BasicDisplayUnit._super.call(this, id);

				this._isSelectable = true;
				this.isDraggable = true;

				this._isSelected = false;
				this._isFocused = false;

				//TODO 仮想化
				this.domRoot = createSvgElement('svg');
				this._rootSvg = this.domRoot;
				this.domRoot.setAttribute('data-h5-dyn-stage-role', 'basicDU'); //TODO for debugging
				this.domRoot.setAttribute('data-h5-dyn-du-id', this.id);
				//this.domRoot = this._graphics._rootSvg; //TODO domRoot -> rootDom, rootElement
			},
			/**
			 * rendererのシグネチャ：function(graphics, du)
			 *
			 * @memberOf h5.ui.components.stage.BasicDisplayUnit
			 */
			setRenderer: function(renderer) {
				if (this._renderer === renderer) {
					return;
				}
				this._renderer = renderer;
				if (renderer != null) {
					//レンダラが変更かつセットされたら再描画
					this.requestRender();
				}
			},

			requestRender: function() {
				if (!this._graphics) {
					return;
				}

				//TODO ここの描画自体も遅延させる
				this._renderer(this._graphics, this);

				if (!this._graphics.isDirty) {
					return;
				}

				var that = this;
				//TODO rAFをここで直接使わない
				requestAnimationFrame(function() {
					that._graphics.render();
				}, 0);
			},

			select: function(isExclusive) {
				if (!this._rootStage) {
					return;
				}
				this._rootStage.select(this, isExclusive);
			},

			unselect: function() {
				if (!this._rootStage) {
					return;
				}
				this._rootStage.unselect(this);
			},

			focus: function() {
				if (!this._rootStage) {
					return;
				}
				this._rootStage.focus(this);
			},

			unfocus: function(andUnselect) {
				if (!this._rootStage) {
					return;
				}
				this._rootStage.unfocus(andUnselect);
			},

			//TODO 引数に位置を取れるようにする？
			//TODO BasicDUに持たせる？ContentsDU?
			scrollIntoView: function() {
			//TODO 未実装。このDUが画面上に表示されるようにStageをスクロールする
			},

			_onAddedToRoot: function(stage) {
				//TODO _superでなくgetParentClass()を
				BasicDisplayUnit._super.prototype._onAddedToRoot.call(this, stage);
				this._rootStage = stage;

				this._graphics = stage._createGraphics(this.domRoot);
				this.requestRender();
			}

		}
	});

	//TODO Path <- Edge などとする
	//TODO DUからrect系をはずすか
	var Edge = DisplayUnit.extend(function() {
		var ERR_CANNOT_USE_RECT_METHOD = 'EdgeではsetRectは使えません';

		var desc = {
			name: 'h5.ui.components.stage.Edge',
			field: {
				_svgLine: null,
				_from: null,
				_to: null,
				_endpointFrom: null,
				_endpointTo: null
			},

			accessor: {
				endpointFrom: {
					get: function() {
						return this._endpointFrom;
					}
				},
				endpointTo: {
					get: function() {
						return this._endpointTo;
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.Edge
				 */
				constructor: function Edge(duFrom, duTo) {
					Edge._super.call(this);
					this._from = duFrom;
					this._to = duTo;

					this._endpointFrom = EdgeEndpoint.create();
					this._endpointTo = EdgeEndpoint.create();

					this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'edge'); //TODO for debugging
					//this._render();
				},
				setRect: function() {
					throw new Error(ERR_CANNOT_USE_RECT_METHOD);
				},
				_render: function() {
					//TODO 仮実装
					//バインドされているDUの位置が変わったら再描画が必要
					var fr = this._from.getRect();
					var tr = this._to.getRect();

					var fwPos = this._from.getWorldGlobalPosition();
					var twPos = this._to.getWorldGlobalPosition();

					//初回のみlineを生成
					if (!this._svgLine) {
						this._svgLine = createSvgElement('line');
						this.domRoot.appendChild(this._svgLine);
					}
					var line = this._svgLine;

					var fromHAlign = this.endpointFrom.junctionHorizontalAlign;
					var toHAlign = this.endpointTo.junctionHorizontalAlign;

					var fromVAlign = this.endpointFrom.junctionVerticalAlign;
					var toVAlign = this.endpointTo.junctionVerticalAlign;

					var x1, y1, x2, y2;

					switch (fromHAlign) {
					case 'left':
						x1 = fwPos.x;
						break;
					case 'right':
						x1 = fwPos.x + fr.width;
						break;
					case 'offset':
						x1 = fwPos.x + this.endpointFrom.junctionOffsetX;
						break;
					case 'nearest':
						var fwCenterX = fwPos.x + fr.width / 2;
						var twCenterX = twPos.x + tr.width / 2;
						if (twCenterX - fwCenterX > 0) {
							//Toノードの中心がFromノードの中心より右にある＝Fromノード側はright相当にする
							x1 = fwPos.x + fr.width;
						} else {
							x1 = fwPos.x;
						}
						break;
					case 'center':
					default:
						x1 = fwPos.x + fr.width / 2;
						break;
					}

					switch (toHAlign) {
					case 'left':
						x2 = twPos.x;
						break;
					case 'right':
						x2 = twPos.x + tr.width;
						break;
					case 'offset':
						x2 = twPos.x + this.endpointTo.junctionOffsetX;
						break;
					case 'nearest':
						var fwCenterX = fwPos.x + fr.width / 2;
						var twCenterX = twPos.x + tr.width / 2;
						if (twCenterX - fwCenterX > 0) {
							//Toノードの中心がFromノードの中心より右にある＝Toノード側はleft相当にする
							x2 = twPos.x;
						} else {
							x2 = twPos.x + tr.width;
						}
						break;
					case 'center':
					default:
						x2 = twPos.x + tr.width / 2;
						break;
					}

					switch (fromVAlign) {
					case 'top':
						y1 = fwPos.y;
						break;
					case 'bottom':
						y1 = fwPos.y + fr.height;
						break;
					case 'offset':
						y1 = fwPos.y + this.endpointFrom.junctionOffsetY;
						break;
					case 'nearest':
						var fwCenterY = fwPos.y + fr.height / 2;
						var twCenterY = twPos.y + tr.height / 2;
						if (twCenterY - fwCenterY > 0) {
							//Toノードの中心がFromノードの中心より下にある＝Fromノード側はbottom相当にする
							y1 = fwPos.y + fr.height;
						} else {
							y1 = fwPos.y;
						}
						break;
					case 'middle':
					default:
						y1 = fwPos.y + fr.height / 2;
						break;
					}

					switch (toVAlign) {
					case 'top':
						y2 = twPos.y;
						break;
					case 'bottom':
						y2 = twPos.y + tr.height;
						break;
					case 'offset':
						y2 = twPos.y + this.endpointTo.junctionOffsetY;
						break;
					case 'nearest':
						var fwCenterY = fwPos.y + fr.height / 2;
						var twCenterY = twPos.y + tr.height / 2;
						if (twCenterY - fwCenterY > 0) {
							//Toノードの中心がFromノードの中心より下にある＝Toノード側はtop相当にする
							y2 = twPos.y;
						} else {
							y2 = twPos.y + tr.height;
						}
						break;
					case 'middle':
					default:
						y2 = twPos.y + tr.height / 2;
						break;
					}

					setSvgAttributes(line, {
						x1: x1,
						y1: y1,
						x2: x2,
						y2: y2
					});
				},

				//TODO BasicDUにも同じメソッドがある。クラス階層について要検討
				requestRender: function() {
					//TODO 正しくは次の再描画フレームで描画
					if (!this._rootStage) {
						return;
					}

					//TODO rAFをここで直接使わない
					var that = this;
					requestAnimationFrame(function() {
						that._render();
					});
				},

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
					this.requestRender();
				}
			}
		};
		return desc;
	});

	var EdgeEndpoint = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.EdgeEndpoint',

			accessor: {
				//top, middle, bottom, offset, nearest, null
				junctionVerticalAlign: null,

				//left, center, right, offset, nearest, null
				junctionHorizontalAlign: null,

				//Alignがoffsetの場合のみ有効
				junctionOffsetX: null,
				junctionOffsetY: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.EdgeEndpoint
				 */
				constructor: function EdgeEndpoint() {
					EdgeEndpoint._super.call(this);
				}

			}
		};
		return desc;
	});

	var DisplayUnitContainer = DisplayUnit.extend(function() {
		function getDisplayUnitByIdInner(container, id) {
			var children = container._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];

				if (child.id === id) {
					return child;
				}

				if (DisplayUnitContainer.isClassOf(child)) {
					var ret = getDisplayUnitByIdInner(child, id);
					if (ret) {
						return ret;
					}
				}
			}
			return null;
		}

		var StageUtil = h5.ui.components.stage.StageUtil;

		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitContainer',
			field: {
				_rootG: null,
				_children: null,
				_scaleX: null,
				_scaleY: null,
				_scrollX: null,
				_scrollY: null,
				_minScaleX: null,
				_minScaleY: null,
				_maxScaleX: null,
				_maxScaleY: null,
				_isUpdateTransformReserved: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitContainer
				 */
				constructor: function DisplayUnitContainer(id) {
					DisplayUnitContainer._super.call(this, id);

					//TODO defaultValue
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._scaleX = 1;
					this._scaleY = 1;

					//min,maxは、nullの場合は無効とする
					this._minScaleX = null;
					this._minScaleY = null;
					this._maxScaleX = null;
					this._maxScaleY = null;

					this._scrollX = 0;
					this._scrollY = 0;

					this._isUpdateTransformReserved = false;

					this._children = [];

					//TODO ここではsvgは作らない。
					this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'container'); //TODO for debugging

					//TODO 暫定的に、コンテナはoverflow:visibleにするようにした
					//width, heightの指定との整合性について検討
					this.domRoot.setAttribute('overflow', 'visible');

					//rootGは<g>要素。transformを一括してかけるため、
					//子要素は全てこの<g>の下に追加する。
					this._rootG = createSvgElement('g');
					this.domRoot.appendChild(this._rootG);
				},

				addDisplayUnit: function(du) {
					this._children.push(du);
					this._rootG.appendChild(du.domRoot);
					du._parentDU = this;

					if (this._rootStage) {
						du._onAddedToRoot(this._rootStage);
					}
				},

				removeDisplayUnit: function(du) {
					var idx = this._children.indexOf(du);
					if (idx !== -1) {
						this._children.splice(idx, 1);
						this._rootG.removeChild(du.domRoot);
						du._parentDU = null;

						//TODO 指定されたduがコンテナの場合にそのduの子供のrootStageも再帰的にnullにする
						du._rootStage = null;
					}
				},

				getDisplayUnitById: function(id) {
					var ret = getDisplayUnitByIdInner(this, id);
					return ret;
				},

				getDisplayUnitAll: function() {
					return this._children;
				},

				_onAddedToRoot: function(rootStage) {
					this._rootStage = rootStage;

					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onAddedToRoot(rootStage);
					}
				},

				setMinScale: function(minScaleX, minScaleY) {
					this._minScaleX = minScaleX;
					this._minScaleY = minScaleY;
					this._clampScale();
				},

				setMaxScale: function(maxScaleX, maxScaleY) {
					this._maxScaleX = maxScaleX;
					this._maxScaleY = maxScaleY;
					this._clampScale();
				},

				setScale: function(scaleX, scaleY) {
					if (scaleX != null) {
						this._scaleX = scaleX;
					}
					if (scaleY != null) {
						this._scaleY = scaleY;
					}
					this._clampScale();
				},

				scrollTo: function(worldX, worldY) {
					this._scrollX = worldX;
					this._scrollY = worldY;
					this._updateTransform();
				},

				scrollBy: function(worldX, worldY) {
					var x = this._scrollX + worldX;
					var y = this._scrollY + worldY;
					this.scrollTo(x, y);
				},

				_clampScale: function() {
					var x = StageUtil.clamp(this._scaleX, this._minScaleX, this._maxScaleX);
					var y = StageUtil.clamp(this._scaleY, this._minScaleY, this._maxScaleY);

					var isScaleChanged = false;
					if (this._scaleX !== x || this._scaleY !== y) {
						isScaleChanged = true;
					}

					this._scaleX = x;
					this._scaleY = y;

					if (isScaleChanged) {
						this._updateTransform();
					}
				},

				_updateTransform: function() {
					if (this._isUpdateTransformReserved) {
						return;
					}
					this._isUpdateTransformReserved = true;

					var that = this;
					//TODO rAFはここで直接呼ばない
					requestAnimationFrame(function() {
						that._isUpdateTransformReserved = false;
						var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
								that._scaleX, that._scaleY, -that._scrollX, -that._scrollY);
						that._rootG.setAttribute('transform', transform);
					});
				}
			}
		};
		return desc;
	});


	//TODO LayerはDUの子クラスにしない方がよいか（DUContainerと一部が同じだとしても）
	var Layer = DisplayUnitContainer.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Layer',
			field: {
				scrollRangeX: null,
				scrollRangeY: null
			},
			method: {
				/**
				 * @constructor
				 * @memberOf h5.ui.components.stage.Layer
				 */
				constructor: function Layer(id) {
					Layer._super.call(this);
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._children = [];

					//TODO ここではsvgは作らない。
					//this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'layer');
					//				this.domRoot.setAttribute('x', 0);
					//				this.domRoot.setAttribute('y', 0);
					//				this.domRoot.setAttribute('width', 1000);
					//				this.domRoot.setAttribute('height', 1000);

					this.id = id;
					//					this._canScrollX = true;
					//					this._canScrollY = true;
				},

				addDisplayUnit: function(du) {
					Layer._super.prototype.addDisplayUnit.call(this, du);
					//du._onAddedToRoot(this._rootStage);
				},

				getWorldGlobalPosition: function() {
					var p = WorldPoint.create(this.x, this.y);
					return p;
				},

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
					Layer._super.prototype._onAddedToRoot.call(this, stage);
				}
			}
		};
		return desc;
	});


	h5.u.obj.expose('h5.ui.components.stage', {
		BasicDisplayUnit: BasicDisplayUnit,
		Layer: Layer,
		DisplayUnitContainer: DisplayUnitContainer,
		Rect: Rect,
		Point: Point,
		WorldPoint: WorldPoint,
		DisplayPoint: DisplayPoint,
		Edge: Edge,
		SVGLinearGradient: SVGLinearGradient
	});

})(jQuery);

(function() {

	var stageLogic = {
		__name: 'h5.ui.components.stage.StageLogic'
	};

	h5.core.expose(stageLogic);

})();

(function($) {

	var RootClass = h5.cls.RootClass;
	var stageModule = h5.ui.components.stage;

	var Viewport = RootClass.extend(function() {
		var DEFAULT_BOUNDARY_WIDTH = 25;

		var desc = {
			name: 'h5.ui.components.stage.Viewport',

			field: {
				_displayRect: null,
				_worldRect: null,
				_scaleX: null,
				_scaleY: null,
				boundaryWidth: null
			},

			accessor: {
				scaleX: {
					get: function() {
						return this._scaleX;
					}
				},
				scaleY: {
					get: function() {
						return this._scaleY;
					}
				},
				displayX: {
					get: function() {
						return this._displayRect.x;
					}
				},
				displayY: {
					get: function() {
						return this._displayRect.y;
					}
				},
				displayWidth: {
					get: function() {
						return this._displayRect.width;
					}
				},
				displayHeight: {
					get: function() {
						return this._displayRect.height;
					}
				},
				worldX: {
					get: function() {
						return this._worldRect.x;
					}
				},
				worldY: {
					get: function() {
						return this._worldRect.y;
					}
				},
				worldWidth: {
					get: function() {
						return this._worldRect.width;
					}
				},
				worldHeight: {
					get: function() {
						return this._worldRect.height;
					}
				},
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.Viewport
				 */
				constructor: function Viewport() {
					Viewport._super.call(this);
					this._displayRect = stageModule.Rect.create();
					this._worldRect = stageModule.Rect.create();
					this._scaleX = 1;
					this._scaleY = 1;
					this.boundaryWidth = DEFAULT_BOUNDARY_WIDTH;
				},

				setDisplaySize: function(dispWidth, dispHeight) {
					this.setDisplayRect(null, null, dispWidth, dispHeight);
				},

				getDisplayRect: function() {
					var rect = stageModule.Rect.create(this._displayRect.x, this._displayRect.y,
							this._displayRect.width, this._displayRect.height);
					return rect;
				},

				setDisplayRect: function(dispX, dispY, dispWidth, dispHeight) {
					this._displayRect.setRect(dispX, dispY, dispWidth, dispHeight);

					var wx = this._displayRect.x / this._scaleX;
					var wy = this._displayRect.y / this._scaleY;
					var ww = this._displayRect.width / this._scaleX;
					var wh = this._displayRect.height / this._scaleY;
					this._worldRect.setRect(wx, wy, ww, wh);
				},

				setWorldSize: function(worldWidth, worldHeight) {
					this.setWorldRect(null, null, worldWidth, worldHeight);
				},

				setWorldRect: function(worldX, worldY, worldWidth, worldHeight) {
					this._worldRect.setRect(worldX, worldY, worldWidth, worldHeight);

					var dx = this._worldRect.x * this._scaleX;
					var dy = this._worldRect.y * this._scaleY;
					var dw = this._worldRect.width * this._scaleX;
					var dh = this._worldRect.height * this._scaleY;
					this._displayRect.setRect(dx, dy, dw, dh);
				},

				getWorldRect: function() {
					var rect = stageModule.Rect.create(this._worldRect.x, this._worldRect.y,
							this._worldRect.width, this._worldRect.height);
					return rect;
				},

				//dispScaleCenterは、ディスプレイ座標系における、拡大時の中心座標。
				//原点は画面の左上ではなくディスプレイ座標系自体の原点(スクロールしている場合特に注意)。
				setScale: function(scaleX, scaleY, centerWorldX, centerWorldY) {
					if (scaleX != null && scaleX >= 0) {
						this._scaleX = scaleX;
					}
					if (scaleY != null && scaleY >= 0) {
						this._scaleY = scaleY;
					}

					//TODO 最小スケール値をここで持たせるか、Stageで制限するか
					if (this._scaleX < 0.05) {
						this._scaleX = 0.05;
					}
					if (this._scaleY < 0.05) {
						this._scaleY = 0.05;
					}

					var oldWorldW = this.worldWidth;
					var oldWorldH = this.worldHeight;

					var newWorldW = this.displayWidth / this._scaleX;
					var newWorldH = this.displayHeight / this._scaleY;
					this._worldRect.setSize(newWorldW, newWorldH);

					//今回の拡縮の際の中心点（ワールド座標系）
					var worldScaleCenterX = centerWorldX;
					var worldScaleCenterY = centerWorldY;

					//この拡縮に伴って発生する左・上のずれの割合を算出
					//(拡縮の中心が画面左上の場合(0,0)、右下の場合(1,1)になる)
					var gapXRatio = (worldScaleCenterX - this._worldRect.x) / oldWorldW;
					var gapYRatio = (worldScaleCenterY - this._worldRect.y) / oldWorldH;

					//求められた比率を使って、実際のずれ量だけスクロールする
					//これにより、指定されたcenterの位置を中心にスクロールしたことになる
					var worldDx = (newWorldW - oldWorldW) * gapXRatio;
					var worldDy = (newWorldH - oldWorldH) * gapYRatio;

					//DisplayRect側を更新すれば、WorldRect側は自動的に更新される
					this.scrollWorldBy(-worldDx, -worldDy);
				},

				scrollTo: function(dispX, dispY) {
					this.setDisplayRect(dispX, dispY, null, null);
				},

				scrollBy: function(dispDx, dispDy) {
					var x = this._displayRect.x + dispDx;
					var y = this._displayRect.y + dispDy;
					this.scrollTo(x, y);
				},

				scrollWorldTo: function(worldX, worldY) {
					this.setWorldRect(worldX, worldY, null, null);
				},

				scrollWorldBy: function(worldDx, worldDy) {
					var x = this._worldRect.x + worldDx;
					var y = this._worldRect.y + worldDy;
					this.scrollWorldTo(x, y);
				},

				getWorldPositionFromDisplayOffset: function(displayOffsetX, displayOffsetY) {
					var wx = this._worldRect.x + displayOffsetX / this._scaleX;
					var wy = this._worldRect.y + displayOffsetY / this._scaleY;
					var point = stageModule.WorldPoint.create(wx, wy);
					return point;
				},

				getDisplayPositionFromDisplayOffset: function(displayOffsetX, displayOffsetY) {
					var dispX = this.displayX + displayOffsetX;
					var dispY = this.displayY + displayOffsetY;
					var point = stageModule.DisplayPoint.create(dispX, dispY);
					return point;
				},

				getXLengthOfWorld: function(displayXLength) {
					return displayXLength / this._scaleX;
				},

				getYLengthOfWorld: function(displayYLength) {
					return displayYLength / this._scaleY;
				},

				getXLengthOfDisplay: function(worldXLength) {
					return worldXLength * this._scaleX;
				},

				getYLengthOfDisplay: function(worldYLength) {
					return worldYLength * this._scaleY;
				},

				getWorldPosition: function(displayX, displayY) {
					var wx = displayX / this._scaleX;
					var wy = displayY / this._scaleY;
					var point = stageModule.WorldPoint.create(wx, wy);
					return point;
				},

				getDisplayPosition: function(worldX, worldY) {
					var dispX = worldX * this._scaleX;
					var dispY = worldY * this._scaleY;
					var point = stageModule.DisplayPoint.create(dispX, dispY);
					return point;
				},

				/**
				 * 指定されたディスプレイ座標が、現在の表示範囲において9-Sliceのどの位置になるかを取得します。
				 *
				 * @param displayX
				 * @param displayY
				 * @returns { x: -1 or 0 or 1, y: -1 or 0 or 1 } というオブジェクト。
				 *          -1の場合は上端または左端、1は下端または右端、0は中央部分
				 */
				getNineSlicePosition: function(displayX, displayY) {
					var nineSlice = {
						x: 0,
						y: 0
					};

					if (this.displayWidth > this.boundaryWidth * 2) {
						//境界とみなす幅(上下あるので2倍する)より現在の描画サイズが小さい場合は
						//必ず「中央」とみなす
						if (displayX < this.boundaryWidth) {
							nineSlice.x = -1;
						} else if (displayX > (this.displayWidth - this.boundaryWidth)) {
							nineSlice.x = 1;
						}
					}

					if (this.displayHeight > this.boundaryWidth * 2) {
						if (displayY < this.boundaryWidth) {
							nineSlice.y = -1;
						} else if (displayY > (this.displayHeight - this.boundaryWidth)) {
							nineSlice.y = 1;
						}
					}

					return nineSlice;
				}
			}
		};
		return desc;
	});

	var EVENT_SIGHT_CHANGE = 'stageSightChange';

	var DisplayPoint = stageModule.DisplayPoint;
	var BasicDisplayUnit = h5.cls.manager.getClass('h5.ui.components.stage.BasicDisplayUnit');

	/**
	 * 選択可能な(isSelectableがtrueな)全てのBasicDUを返す
	 *
	 * @param {DisplayUnit} root 探索のルートとなるDisplayUnit
	 * @returns BasicDisplayUnitの配列
	 */
	function getAllSelectableDisplayUnits(root) {
		var ret = [];

		if (typeof root._children !== 'undefined') {
			//rootが_childrenを持つ＝Containerの場合はroot自身は戻り値に含めない
			var children = root._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];
				var descendants = getAllSelectableDisplayUnits(child);
				var filtered = descendants.filter(function(du) {
					return BasicDisplayUnit.isClassOf(du) && du.isSelectable;
				});
				Array.prototype.push.apply(ret, filtered);
			}
		} else {
			ret.push(root);
		}
		return ret;
	}

	/**
	 * コンテナを含む、全てのDUを返す
	 *
	 * @private
	 * @param {DisplayUnit} root 探索のルートとなるDisplayUnit
	 * @returns 全てのDisplayUnitを含む配列
	 */
	function getAllDisplayUnits(root) {
		var ret = [];

		if (typeof root._children !== 'undefined') {
			//rootが_childrenを持つ＝Containerの場合はroot自身は戻り値に含めない
			var children = root._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];
				var descendants = getAllDisplayUnits(child);
				Array.prototype.push.apply(ret, descendants);
			}
		} else {
			ret.push(root);
		}
		return ret;
	}

	//TODO DRAG_MODE, SCR_DIR を定数として見えるようにする
	var DRAG_MODE_NONE = 0;
	var DRAG_MODE_AUTO = 1;
	var DRAG_MODE_SCREEN = 2;
	var DRAG_MODE_DU = 3;
	var DRAG_MODE_SELECT = 4;

	var SCROLL_DIRECTION_NONE = 0;
	var SCROLL_DIRECTION_X = 1;
	var SCROLL_DIRECTION_Y = 2;
	var SCROLL_DIRECTION_XY = 3;

	var BOUNDARY_SCROLL_INTERVAL = 20;
	var BOUNDARY_SCROLL_INCREMENT = 10;

	var EVENT_DU_MOUSE_LEAVE = 'duMouseLeave';
	var EVENT_DU_MOUSE_ENTER = 'duMouseEnter';

	var ABSOLUTE_SCALE_MIN = 0.01;

	var StageUtil = h5.ui.components.stage.StageUtil;

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		//ルートとなるSVG要素(直接の子は_layerRootGのg要素のみ)
		_duRoot: null,

		//全てのレイヤーの親となるg要素。実質的に全てのDUはこのg要素の下に入る。
		_layerRootG: null,

		_units: null,

		_viewport: null,

		_initData: null,

		_defs: null,

		UIDragScreenScrollDirection: SCROLL_DIRECTION_XY,

		//(UI操作によるかどうかは関係なく)スクロールする範囲を配列で指定。
		//{ min: , max: } をディスプレイ座標で指定。
		_scrollRangeX: {
			min: null,
			max: null
		},

		_scrollRangeY: {
			min: null,
			max: null
		},

		_scaleRangeX: {
			min: ABSOLUTE_SCALE_MIN,
			max: null
		},

		_scaleRangeY: {
			min: ABSOLUTE_SCALE_MIN,
			max: null
		},

		//TODO dependsOn()
		_selectionLogic: h5.ui.SelectionLogic,

		select: function(displayUnit, isExclusive) {
			this._selectionLogic.select(displayUnit, isExclusive);
		},

		selectAll: function() {
			var basicUnits = this._getAllSelectableDisplayUnits();
			this._selectionLogic.select(basicUnits);
		},

		_getAllSelectableDisplayUnits: function() {
			var layers = this._layers;
			var ret = [];
			for (var i = 0, len = layers.length; i < len; i++) {
				var layer = layers[i];
				var units = getAllSelectableDisplayUnits(layer);
				Array.prototype.push.apply(ret, units);
			}
			return ret;
		},

		unselect: function(du) {
			this._selectionLogic.unselect(du);
		},

		unselectAll: function() {
			this._selectionLogic.unselectAll();
		},

		getDisplayUnitById: function(id) {
			var layers = this._layers;
			for (var i = 0, len = layers.length; i < len; i++) {
				var layer = layers[i];
				var du = layer.getDisplayUnitById(id);
				if (du) {
					return du;
				}
			}
			return null;
		},

		getDisplayUnitUnderPointer: function() {
			return this._lastEnteredDU;
		},

		getDisplayUnitsInRect: function(displayX, displayY, displayWidth, displayHeight,
				isSelectableOnly) {
			var wtl = this._viewport.getWorldPosition(displayX, displayY);
			var ww = this._viewport.getXLengthOfWorld(displayWidth);
			var wh = this._viewport.getYLengthOfWorld(displayHeight);

			//ワールド座標系のRectに直す
			var wRect = stageModule.Rect.create(wtl.x, wtl.y, ww, wh);

			if (isSelectableOnly === undefined) {
				//isSelectableOnlyはデフォルト：true
				isSelectableOnly = true;
			}

			//指定されたRectに完全に含まれるDUを全て返す
			var ret = [];
			var allDU = isSelectableOnly ? this._getAllSelectableDisplayUnits() : this
					.getDisplayUnitsAll();
			for (var i = 0, len = allDU.length; i < len; i++) {
				var du = allDU[i];
				var worldGlobalPos = du.getWorldGlobalPosition();
				var duGlobalRect = stageModule.Rect.create(worldGlobalPos.x, worldGlobalPos.y,
						du.width, du.height);
				if (wRect.contains(duGlobalRect)) {
					ret.push(du);
				}
			}
			return ret;
		},

		getSelectedDisplayUnits: function() {
			var selected = this._selectionLogic.getSelected();
			return selected;
		},

		isSelected: function(displayUnit) {
			var isSelected = this._selectionLogic.isSelected(displayUnit);
			return isSelected;
		},

		focus: function(displayUnit) {
			return this._selectionLogic.focus(displayUnit);
		},

		unfocus: function(andUnselect) {
			return this._selectionLogic.unfocus(andUnselect);
		},

		getFocusedDisplayUnit: function() {
			var focused = this._selectionLogic.getFocused();
			return focused;
		},

		isFocused: function(displayUnit) {
			var isFocused = this._selectionLogic.isFocused(displayUnit);
			return isFocused;
		},

		/**
		 * 引数で指定された全てのタグを含むDisplayUnitを返します。
		 *
		 * @param tags タグ文字列またはタグ文字列の配列
		 * @returns {Array}
		 */
		getDisplayUnitsByGroupTag: function(tags) {
			var ret = [];

			//Array.isArray()はES5＝IE9以上で実装されているので利用可能
			if (!Array.isArray(tags)) {
				tags = [tags];
			}

			var allUnits = this.getDisplayUnitsAll();
			for (var i = 0, len = allUnits.length; i < len; i++) {
				var hasAllTags = true;
				var unit = allUnits[i];

				//tagsで指定された全てのタグを含んでいたら
				//そのDUを戻り値に含める
				var groupTag = unit.groupTag;
				for (var j = 0, jLen = tags.length; j < jLen; j++) {
					if (!groupTag.has(tags[j])) {
						hasAllTags = false;
						break;
					}
				}

				if (hasAllTags) {
					ret.push(unit);
				}
			}

			return ret;
		},

		getDisplayUnitsAll: function() {
			var ret = [];
			var layers = this._layers;
			for (var i = 0, len = layers.length; i < len; i++) {
				var units = getAllDisplayUnits(layers[i]);
				Array.prototype.push.apply(ret, units);
			}
			return ret;
		},

		_getDefs: function() {
			if (!this._defs) {
				var SVGDefinitions = h5.cls.manager
						.getClass('h5.ui.components.stage.SVGDefinitions');
				var element = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
				this._defs = SVGDefinitions.create(element);
				this._duRoot.appendChild(element);
			}
			return this._defs;
		},

		_createGraphics: function(svgRoot) {
			var SVGGraphics = h5.cls.manager.getClass('h5.ui.components.stage.SVGGraphics');
			var graphics = SVGGraphics.create(svgRoot, this._getDefs());
			return graphics;
		},

		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this._viewport = Viewport.create();
			this.UIDragMode = DRAG_MODE_AUTO;
		},

		__ready: function() {
			if (!this._duRoot) {
				var rootSvg = stageModule.SvgUtil.createSvgElement('svg');
				this._duRoot = rootSvg;
				this._layerRootG = stageModule.SvgUtil.createSvgElement('g');
				this._duRoot.appendChild(this._layerRootG);

				//rootSvg.setAttribute('overflow', 'visible');
			}

			this._selectionLogic.addSelectionListener(function(du, isSelected, isFocused) {
				du._isSelected = isSelected;
				du._isFocused = isFocused;
			});

			this.rootElement.appendChild(this._duRoot);

			this._setupRootEventListeners();

			this.refresh(true);
		},

		_setupRootEventListeners: function() {
			var root = this.rootElement;
			//SVG要素はjQueryでは明示的にはサポートしていない(イベントハンドラなどは実際には動くが)こと、
			//また、今回は独自にイベントを発生させるために内部的にキャッチしたいので
			//直接リッスンする
			//TODO removeする
			root.addEventListener('click', this.own(this._rootClickHandler));
			root.addEventListener('dblclick', this.own(this._rootDblclickHandler));
		},

		/**
		 * targetで指定された要素を含むBasicDUを返す。 BasicDUに含まれていない場合はnullを返す。
		 *
		 * @param target
		 */
		_getIncludingDisplayUnit: function(target) {
			function getIncludingDUInner(elem) {
				if (elem === root) {
					return null;
				}
				var duId = elem.getAttribute('data-h5-dyn-du-id');
				var du = this.getDisplayUnitById(duId);
				if (BasicDisplayUnit.isClassOf(du)) {
					return du;
				}
				return getIncludingDUInner.call(this, elem.parentNode);
			}

			var root = this.rootElement;

			var ret = getIncludingDUInner.call(this, target);
			return ret;
		},

		_rootClickHandler: function(event) {
			this._processClick(event, 'duClick');
		},

		_rootDblclickHandler: function(event) {
			this._processClick(event, 'duDblclick');
		},

		_processClick: function(event, triggerEventName) {
			if (this._isDraggingJustEnded) {
				//ドラッグ操作が終わった直後のclickイベントの場合は何もしない
				this._isDraggingJustEnded = false;
				return;
			}

			var du = this._getIncludingDisplayUnit(event.target);
			var isExclusive = !event.shiftKey;
			if (!du) {
				if (isExclusive) {
					this._selectionLogic.unselectAll();
				}
				return;
			}
			du.select(isExclusive);
			du.focus();

			var evArg = {
				stageController: this,
				displayUnit: du
			};
			this.trigger(triggerEventName, evArg);
		},

		UIDragMode: DRAG_MODE_AUTO,

		_currentDragMode: DRAG_MODE_NONE,

		_dragTargetDU: null,

		_dragSelectStartPos: null,

		_dragSelectStartSelectedDU: null,

		_dragLastPagePos: null,

		'{rootElement} h5trackstart': function(context) {
			var event = context.event;
			var du = this._getIncludingDisplayUnit(event.target); //BasicDUを返す

			this._currentDragMode = DRAG_MODE_NONE;

			switch (this.UIDragMode) {
			case DRAG_MODE_NONE:
				//UI操作によるドラッグを行わないモードの場合は、何もしない
				break;
			case DRAG_MODE_DU:
				//DUドラッグモード、かつ実際にDUをつかんでいたら、DUドラッグを開始
				//DUを掴んでいなかった場合は、何もしない
				if (du && du.isDraggable) {
					this._currentDragMode = DRAG_MODE_DU;
				}
				break;
			case DRAG_MODE_SCREEN:
				if (this.UIDragScreenScrollDirection !== SCROLL_DIRECTION_NONE) {
					//SCREENドラッグモード固定、かつ、
					//UI操作によるスクロールがX,Yどちらかの方向に移動可能な場合はスクリーンドラッグを開始
					this._currentDragMode = DRAG_MODE_SCREEN;
				}
				break;
			case DRAG_MODE_SELECT:
				//SELECTモード固定なら、SELECTドラッグを開始
				this._currentDragMode = DRAG_MODE_SELECT;
				saveDragSelectStartPos.call(this);
				this._dragSelectStartSelectedDU = this.getSelectedDisplayUnits();
				break;
			case DRAG_MODE_AUTO:
			default:
				//UIDragModeがAUTOの場合
				if (du) {
					if (du.isDraggable) {
						//DUを掴んでいて、かつそれがドラッグ可能な場合はDUドラッグを開始
						this._currentDragMode = DRAG_MODE_DU;
						this._dragTargetDU = du;
					}
				} else {
					//DUを掴んでいない場合、Ctrlキーを押している場合はSELECTドラッグ、
					//押していなくてかつスクロール方向がNONE以外ならSCREENドラッグを開始
					if (event.shiftKey) {
						this._currentDragMode = DRAG_MODE_SELECT;
						saveDragSelectStartPos.call(this);
						this._dragSelectStartSelectedDU = this.getSelectedDisplayUnits();
					} else if (this.UIDragScreenScrollDirection !== SCROLL_DIRECTION_NONE) {
						this._currentDragMode = DRAG_MODE_SCREEN;
					}
				}
				break;
			}

			function saveDragSelectStartPos() {
				var rootOffset = $(this.rootElement).offset();

				var dispStartOffX = event.pageX - rootOffset.left;
				var dispStartOffY = event.pageY - rootOffset.top;
				this._dragSelectStartPos = this._viewport.getDisplayPositionFromDisplayOffset(
						dispStartOffX, dispStartOffY);
			}

		},

		'{rootElement} h5trackmove': function(context) {
			if (this._currentDragMode === DRAG_MODE_NONE) {
				return;
			}

			//このフラグは、clickイベントハンドラ(_processClick())の中で
			//「ドラッグ操作直後のclickイベントかどうか」（＝そのclickイベントは無視すべきかどうか）を
			//判断するためのフラグである。
			//ただし、h5trackendは一度もマウスが動かなかった場合でも発火するため、
			//trackendのタイミングでtrueにしてしまうと、常にフラグがtrueになってしまう。
			//そのため、一度以上実際にmoveが起きたこのタイミングでフラグをtrueにすることで
			//実際ドラッグが行われた場合のみフラグがONになる。
			this._isDraggingJustEnded = true;

			var event = context.event;

			var dispDx = event.dx;
			var dispDy = event.dy;

			if (dispDx === 0 && dispDy === 0) {
				//X,Yどちらの方向にも実質的に動きがない場合は何もしない
				return;
			}

			var that = this;

			switch (this._currentDragMode) {
			case DRAG_MODE_DU:
				toggleBoundaryScroll.call(this, function(dispScrX, dispScrY) {
					that._dragTargetDU.moveDisplayBy(dispScrX, dispScrY);
				});
				this._dragTargetDU.moveDisplayBy(dispDx, dispDy);
				break;
			case DRAG_MODE_SELECT:
				this._dragLastPagePos = {
					x: event.pageX,
					y: event.pageY
				};

				toggleBoundaryScroll.call(this, function() {
					var dragSelectedDU = dragSelect.call(that);
					var tempSelection = that._dragSelectStartSelectedDU.concat(dragSelectedDU);
					that.select(tempSelection, true);
				});

				var dragSelectedDU = dragSelect.call(this);
				var tempSelection = this._dragSelectStartSelectedDU.concat(dragSelectedDU);
				this.select(tempSelection, true);
				console.log(this.getSelectedDisplayUnits().length);
				break;
			case DRAG_MODE_SCREEN:
				switch (this.UIDragScreenScrollDirection) {
				case SCROLL_DIRECTION_X:
					dispDy = 0;
					break;
				case SCROLL_DIRECTION_Y:
					dispDx = 0;
					break;
				case SCROLL_DIRECTION_XY:
					break;
				case SCROLL_DIRECTION_NONE:
				default:
					dispDx = 0;
					dispDy = 0;
					break;
				}

				if (dispDx !== 0 || dispDy !== 0) {
					//X,Yどちらかの方向に移動量がある場合はスクロール処理を行う
					//ただしScrollRangeが指定されている場合は実際にはスクロールしない可能性はある
					this.scrollBy(-dispDx, -dispDy);
				}
				break;
			default:
				break;
			}

			function dragSelect() {
				var rootOffset = $(this.rootElement).offset();

				var dispLastOffX = this._dragLastPagePos.x - rootOffset.left;
				var dispLastOffY = this._dragLastPagePos.y - rootOffset.top;

				var dispStartPos = this._dragSelectStartPos;
				var dispLastPos = this._viewport.getDisplayPositionFromDisplayOffset(dispLastOffX,
						dispLastOffY);

				var dispW = dispLastPos.x - dispStartPos.x;
				var dispActualX;
				if (dispW < 0) {
					dispActualX = dispLastPos.x;
					dispW *= -1;
				} else {
					dispActualX = dispStartPos.x;
				}

				var dispH = dispLastPos.y - dispStartPos.y;
				var dispActualY;
				if (dispH < 0) {
					dispActualY = dispLastPos.y;
					dispH *= -1;
				} else {
					dispActualY = dispStartPos.y;
				}

				this.log.debug('dragSelect: x={0},y={1},w={2},h={3}', dispActualX, dispActualY,
						dispW, dispH);

				return this.getDisplayUnitsInRect(dispActualX, dispActualY, dispW, dispH, true);
			}

			function toggleBoundaryScroll(callback) {
				var nineSlice = this._viewport.getNineSlicePosition(context.event.offsetX,
						context.event.offsetY);
				if (nineSlice.x !== 0 || nineSlice.y !== 0) {
					this._beginBoundaryScroll(nineSlice, callback);
				} else {
					this._endBoundaryScroll();
				}
			}
		},

		'{rootElement} h5trackend': function(context) {
			this._currentDragMode = DRAG_MODE_NONE;
			this._dragTargetDU = null;
			this._dragSelectStartPos = null;
			this._dragSelectStartSelectedDU = null;
			this._dragLastPagePos = null;
			this._endBoundaryScroll();
		},

		_isDraggingJustEnded: false,

		_boundaryScrollTimerId: null,

		_nineSlice: null,

		_beginBoundaryScroll: function(nineSlice, callback) {
			//途中で方向が変わった場合のため、9-Sliceだけは常に更新する
			this._nineSlice = nineSlice;

			if (this._boundaryScrollTimerId) {
				return;
			}

			var that = this;
			this._boundaryScrollTimerId = setInterval(function() {
				//ディスプレイ座標系での移動量
				var boundaryScrX = BOUNDARY_SCROLL_INCREMENT * that._nineSlice.x;
				var boundaryScrY = BOUNDARY_SCROLL_INCREMENT * that._nineSlice.y;

				that.scrollBy(boundaryScrX, boundaryScrY);
				callback(boundaryScrX, boundaryScrY);
			}, BOUNDARY_SCROLL_INTERVAL);
		},

		_endBoundaryScroll: function() {
			if (this._boundaryScrollTimerId) {
				clearInterval(this._boundaryScrollTimerId);
				this._boundaryScrollTimerId = null;
				this._nineSlice = null;
			}
		},

		//_dragController: h5.ui.components.stage.DragController,

		_updateRootSize: function(width, height) {
			var w = width !== undefined ? width : $(this.rootElement).width();
			var h = height !== undefined ? height : $(this.rootElement).height();

			//TODO svgのwidth, heightはsetAttribute()を使うのが正しい？？NS確認
			stageModule.SvgUtil.setSvgAttributes(this._duRoot, {
				width: w,
				height: h
			});

			this._viewport.setDisplaySize(w, h);
			this._updateViewBox();
		},

		_updateViewBox: function() {
			var wr = this._viewport.getWorldRect();

			//位置は変えない
			var x = 0;
			var y = 0;
			var w = wr.width;
			var h = wr.height;

			this._duRoot.setAttribute('viewBox', h5.u.str.format('{0} {1} {2} {3}', x, y, w, h));
		},

		setup: function(initData) {
			//TODO setup()が__readyより前などいつ呼ばれても正しく動作するようにする

			this._initData = initData;

			if (initData.layers) {
				for (var i = 0, len = initData.layers.length; i < len; i++) {
					var layer = stageModule.Layer.create(initData.layers[i].id);
					this.addLayer(layer);
				}
			}
		},

		//TODO layerRootGに直接ではなくデフォルト（背景）レイヤーにaddする
		addDisplayUnit: function(displayUnit) {
			this._units.set(displayUnit.id, displayUnit);
			this._layerRootG.appendChild(displayUnit.domRoot);

			displayUnit.domRoot.setAttributeNS(null, 'x', displayUnit.x);
			displayUnit.domRoot.setAttributeNS(null, 'y', displayUnit.y);

			if (displayUnit._renderer) {
				displayUnit._renderer();
			}

		},

		removeDisplayUnit: function(displayUnit) {
			this.removeById(displayUnit.id);
		},

		removeDisplayUnitById: function(id) {
			this._unit["delete"](id);
			this._layerRootG.removeChild(displayUnit.domRoot);
		},

		removeDisplayUnitAll: function() {
		//TODO
		},

		addLayer: function(layer, index) {
			if (index != null) {
				this._layers.splice(index, 0, layer);
			} else {
				this._layers.push(layer);
			}
			this._layerRootG.appendChild(layer.domRoot);
			layer._onAddedToRoot(this);
		},

		getLayer: function(id) {
			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				if (layer.id === id) {
					return layer;
				}
			}
			return null;
		},

		_isUpdateTransformReserved: false,

		_updateTransform: function() {
			if (this._isUpdateTransformReserved) {
				return;
			}
			this._isUpdateTransformReserved = true;

			var that = this;
			//TODO rAFはここで直接呼ばない
			requestAnimationFrame(function() {
				that._isUpdateTransformReserved = false;
				var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
						that._viewport.scaleX, that._viewport.scaleY, -that._viewport.worldX,
						-that._viewport.worldY);
				that._layerRootG.setAttribute('transform', transform);
			});
		},

		scrollTo: function(dispX, dispY) {
			var oldPos = DisplayPoint.create(this._viewport.displayX, this._viewport.displayY);

			var actualDispX = StageUtil
					.clamp(dispX, this._scrollRangeX.min, this._scrollRangeX.max);
			var actualDispY = StageUtil
					.clamp(dispY, this._scrollRangeY.min, this._scrollRangeY.max);

			if (this._viewport.displayX === actualDispX && this._viewport.displayY === actualDispY) {
				//サイズが現在と変わらなかったら何もしない
				return;
			}

			this._viewport.scrollTo(actualDispX, actualDispY);

			this._updateTransform();

			var newPos = DisplayPoint.create(actualDispX, actualDispY);

			//TODO 現在はこの場所でイベントを出しているが、
			//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
			//描画更新後にイベントをあげるようにする
			var evArg = {
				scrollPosition: {
					oldValue: oldPos,
					newValue: newPos,
					isChanged: true
				},
				scale: {
					oldValue: {
						x: this._viewport.scaleX,
						y: this._viewport.scaleY
					},
					newValue: {
						x: this._viewport.scaleX,
						y: this._viewport.scaleY
					},
					isChanged: false
				}
			};
			this.trigger(EVENT_SIGHT_CHANGE, evArg);
		},

		scrollBy: function(displayDx, displayDy) {
			if (displayDx === 0 && displayDy === 0) {
				return;
			}

			var dx = this._viewport.displayX + displayDx;
			var dy = this._viewport.displayY + displayDy;
			this.scrollTo(dx, dy);
		},

		scrollWorldTo: function(worldX, worldY) {
			var dispPos = this._viewport.getDisplayPosition(worldX, worldY);
			this.scrollTo(dispPos.x, dispPos.y);
		},

		scrollWorldBy: function(worldDx, worldDy) {
			if (worldDx === 0 && worldDy === 0) {
				return;
			}

			var dx = this._viewport.worldX + worldDx;
			var dy = this._viewport.worldY + worldDy;
			this.scrollWorldTo(dx, dy);
		},

		/**
		 * このステージの拡大率を設定します。スケール値はワールド座標系に対して設定されます。<br>
		 * つまり、scaleを2にすると、画面上は各オブジェクトが2倍の大きさの大きさで表示されます。<br>
		 * このメソッドを呼び出すことは、すべてのレイヤーのsetScale()に同じ値を設定することと等価です。<br>
		 * ただし、DisplayUnit.setScale()と異なり、拡縮時の中心位置を指定することができます。
		 *
		 * @param scaleX X軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param scaleY Y軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param displayOffsetX 拡縮時の中心点のx（ディスプレイ座標系におけるoffsetX(stageのルート要素の左上を基準とした座標)）
		 * @param displayOffsetY 拡縮時の中心点のy（仕様はxと同じ）
		 */
		setScale: function(scaleX, scaleY, displayOffsetX, displayOffsetY) {
			var actualScaleX = StageUtil
					.clamp(scaleX, this._scaleRangeX.min, this._scaleRangeX.max);
			var actualScaleY = StageUtil
					.clamp(scaleY, this._scaleRangeY.min, this._scaleRangeY.max);

			if (actualScaleX === this._viewport.scaleX && actualScaleY === this._viewport.scaleY) {
				return;
			}

			var offX = displayOffsetX;
			var offY = displayOffsetY;

			if (displayOffsetX == null && displayOffsetY == null) {
				var rootOffset = $(this.rootElement).offset();
				if (displayOffsetX == null) {
					offX = rootOffset.left + this._viewport.displayWidth / 2;
				}
				if (displayOffsetY == null) {
					offY = rootOffset.top + this._viewport.displayHeight / 2;
				}
			}

			var scaleCenter = this._viewport.getWorldPositionFromDisplayOffset(offX, offY);

			var oldScrollPos = DisplayPoint
					.create(this._viewport.displayX, this._viewport.displayY);
			var oldScaleX = this._viewport.scaleX;
			var oldScaleY = this._viewport.scaleY;

			this._viewport.setScale(actualScaleX, actualScaleY, scaleCenter.x, scaleCenter.y);

			var newScrollPos = DisplayPoint
					.create(this._viewport.displayX, this._viewport.displayY);

			var isScrollPoisitionChanged = true;
			if (oldScrollPos.x === newScrollPos.x && oldScrollPos.y === newScrollPos.y) {
				isScrollPoisitionChanged = false;
			}

			this._updateTransform();

			//TODO 現在はこの場所でイベントを出しているが、
			//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
			//描画更新後にイベントをあげるようにする
			var evArg = {
				scrollPosition: {
					oldValue: oldScrollPos,
					newValue: newScrollPos,
					isChanged: isScrollPoisitionChanged
				},
				scale: {
					oldValue: {
						x: oldScaleX,
						y: oldScaleY
					},
					newValue: {
						x: actualScaleX,
						y: actualScaleY
					},
					isChanged: true
				}
			};
			this.trigger(EVENT_SIGHT_CHANGE, evArg);
		},

		setScaleRangeX: function(min, max) {
			var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

			this._scaleRangeX = {
				min: actualMin,
				max: max
			};

			this.setScale(this._viewport.scaleX, null);
		},

		setScaleRangeY: function(min, max) {
			var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

			this._scaleRangeY = {
				min: actualMin,
				max: max
			};

			this.setScale(null, this._viewport.scaleY);
		},

		refresh: function(immediate) {
			this._updateRootSize();
		},

		getScrollPosition: function() {
			var pos = stageModule.DisplayPoint.create(this._viewport.displayX,
					this._viewport.displayY);
			return pos;
		},

		//		'{rootElement} dgDragStart': function(context, $el) {
		//			var ds = context.evArg.dragSession;
		//			ds.addDragCallback(this._own(this._onDragMove));
		//		},

		_lastEnteredDU: null,

		'{rootElement} mousemove': function(context, $el) {
			if (this._currentDragMode !== DRAG_MODE_NONE) {
				//ドラッグ中の場合はドラッグハンドラ(h5trackmove)の方で処理する
				return;
			}

			var currentMouseOverDU = this._getIncludingDisplayUnit(context.event.target);

			if (currentMouseOverDU === this._lastEnteredDU) {
				return;
			}

			if (this._lastEnteredDU) {
				//いずれかのDUにマウスオーバーしていた場合、
				//マウスオーバーしているDUが変わったので、前のDUはMouseLeaveにする
				this.trigger(EVENT_DU_MOUSE_LEAVE, {
					displayUnit: this._lastEnteredDU
				});
			}

			this._lastEnteredDU = currentMouseOverDU;

			if (currentMouseOverDU) {
				//新しく別のDUにマウスオーバーした場合
				this.trigger(EVENT_DU_MOUSE_ENTER, {
					displayUnit: currentMouseOverDU
				});
			}
		},

		'{rootElement} mousewheel': function(context, $el) {
			var event = context.event;

			event.preventDefault();

			// TODO どの操作でどうするかは要検討
			if (event.shiftKey) {
				// シフトキーが押されていたら拡大縮小
				var ds = 0.1;
				if (event.originalEvent.wheelDelta > 0) {
					ds *= -1;
				}

				var rootOffset = $(this.rootElement).offset();
				var offsetX = event.originalEvent.pageX - rootOffset.left;
				var offsetY = event.originalEvent.pageY - rootOffset.top;

				this.setScale(this._viewport.scaleX + ds, this._viewport.scaleY + ds, offsetX,
						offsetY);
				return;
			}

			var dy = 40;
			if (event.originalEvent.wheelDelta > 0) {
				dy *= -1;
			}
			this.scrollBy(0, dy);
		},

		//		_onDragMove: function(ds, dx, dy) {
		//			this.scrollBy(dx, dy);
		//		},

		setScrollRangeX: function(minDisplayX, maxDisplayX) {
			this._scrollRangeX = {
				min: minDisplayX,
				max: maxDisplayX
			};
		},

		setScrollRangeY: function(minDisplayY, maxDisplayY) {
			this._scrollRangeY = {
				min: minDisplayY,
				max: maxDisplayY
			};
		}

	};


	h5.core.expose(stageController);

})(jQuery);
