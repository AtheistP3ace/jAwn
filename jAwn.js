(function (jAwn, window, document, undefined) {

    // Private Variables
    var rnotwhite = (/\S+/g);
    var rmsPrefix = /^-ms-/;
    var rdashAlpha = /-([\da-z])/gi;
    var fcamelCase = function (all, letter) {

        return letter.toUpperCase();

    };

    // Private Methods
    function camelCase (string) {

        return string.replace(rmsPrefix, 'ms-').replace(rdashAlpha, fcamelCase);

    };

    function acceptData (owner) {

        // Accepts only:
        //  - Node
        //    - Node.ELEMENT_NODE
        //    - Node.DOCUMENT_NODE
        //  - Object
        //    - Any
        return owner && (owner.nodeType === 1 || owner.nodeType === 9 || !(+owner.nodeType));

    };

    // Data Cache Definition
    function Data () {

        this.cacheKey = 'jAwnCache3.0' + Data.guid++;

    };
    Data.guid = 1;
    Data.accepts = acceptData;
    Data.prototype = {
        register: function (owner) {

            var value = {};

            // If it is a node unlikely to be stringify-ed or looped over use plain assignment
            if (owner.nodeType) {
                owner[this.cacheKey] = value;
            }
            else {
                // Otherwise secure it in a non-enumerable, non-writable property
                // configurability must be true to allow the property to be
                // deleted with the delete operator
                Object.defineProperty(owner, this.cacheKey, {
                    value: value,
                    writable: true,
                    configurable: true
                });
            }
            return owner[this.cacheKey];

        },
        cache: function (owner) {

            // We can accept data for non-element nodes in modern browsers, but we should not, see #8335.
            // Always return an empty object.
            if (!Data.accepts(owner)) {
                return {};
            }

            // Check if the owner object already has a cache
            var cache = owner[this.cacheKey];

            // If so, return it
            if (cache) {
                return cache;
            }

            // If not, register one
            return this.register(owner);

        },
        set: function (owner, data, value) {

            var prop, cache = this.cache(owner);
            if (typeof data === 'string') {
                cache[camelCase(data)] = value;
            }
            else {
                // Copy the properties one-by-one to the cache object
                for (prop in data) {
                    cache[camelCase(prop)] = data[prop];
                }
            }
            return cache;

        },
        get: function (owner, key) {

            var cache = this.cache(owner);
            return key === undefined ? cache : cache[camelCase(key)];

        },
        access: function (owner, key, value) {

            // In cases where either:
            //
            //   1. No key was specified
            //   2. A string key was specified, but no value provided
            //
            // Take the 'read' path and allow the get method to determine
            // which value to return, respectively either:
            //
            //   1. The entire cache object
            //   2. The data stored at the key
            //
            if (key === undefined || ((key && typeof key === 'string') && value === undefined)) {
                return this.get(owner, key);
            }

            // [*]When the key is not a string, or both a key and value
            // are specified, set or extend (existing objects) with either:
            //
            //   1. An object of properties
            //   2. A key and value
            //
            this.set(owner, key, value);

            // Since the 'set' path can have two possible entry points
            // return the expected data based on which path was taken[*]
            return value !== undefined ? value : key;

        },
        remove: function (owner, key) {

            var index, cache = owner[this.cacheKey];

            if (cache === undefined) {
                return;
            }

            if (key !== undefined) {

                // Support array or space separated string of keys
                if (Array.isArray(key)) {
                    key = key.map(camelCase);
                }
                else {
                    key = camelCase(key);

                    // If a key with the spaces exists, use it.
                    // Otherwise, create an array by matching non-whitespace
                    key = key in cache ? [key] : (key.match(rnotwhite) || []);
                }

                index = key.length;

                while (index--) {
                    delete cache[key[index]];
                }
            }

            // Remove the cache key if there's no more data
            if (key === undefined || isEmptyObject(cache)) {
                delete owner[ this.cacheKey ];
            }

        },
        hasData: function (owner) {

            var cache = owner[this.cacheKey];
            return cache !== undefined && !isEmptyObject(cache);

        }
    };

    // Create new cache
    var dataCache = new Data();

    // Public Methods
	jAwn.cache = {};
    jAwn.cache.get = function (element, key) {

        return dataCache.get(element, key);

    };

    jAwn.cache.set = function (element, key, value) {

        return dataCache.set(element, key, value);

    };

    jAwn.cache.access = function (element, key, value) {

        return dataCache.access(element, key, value);

    };

    jAwn.cache.hasData = function (element) {

        return dataCache.hasData(element);

    };

    jAwn.cache.remove = function (element, key) {

        return dataCache.remove(element, key);

    };

    // TODO: Test performance
    // Called from jAwn.RemoveElement to cleanup data and events on elements prior to removal from DOM
    function cleanElementData (elements) {

        // Convert elements to an array, if necessary.
        if (!elements.length) {
            elements = [elements];
        }
        var data, element, type, index = 0;
        var eventInternal = getInternal();
        var special = eventInternal.special;

        // For each element destroy widgets, remove events and delete any remaining data
        for ( ; (element = elements[index]) !== undefined; index++) {
            if (acceptData(element) && (data = element[dataCache.cacheKey])) {
                if (data.events) {
                    // Destroy widgets on elements
                    try {
                        // Only trigger remove when necessary to save time
                        if (data.events.remove) {
                            jAwn.triggerHandler(element, 'remove');
                        }
                    } catch (e) {}

                    // Remove events
                    for (type in data.events) {
                        if (special[type]) {
                            eventInternal.remove(element, type);
                        }
                        else {
                            // Shortcut to avoid jAwn.event.remove's overhead
                            if (element.removeEventListener) {
                                element.removeEventListener(type, data.handle);
                            }
                        }
                    }
                }

                // Remove data
                delete element[dataCache.cacheKey];
            }
        }

    };

    // Private Variables
    var eventGUID = 0;
    var commonGUID = 'jAwn' + ('3.0' + Math.random()).replace(/\D/g, '');
    var expr = {
        attrHandle: {},
        match: {
            bool: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped)$/i,
            needsContext: /^[\x20\t\r\n\f]*[>+~]/
        }
    };
    var focusinBubbles = 'onfocusin' in window;
    var plainObject = {};
    var hasOwn = plainObject.hasOwnProperty;
    var toString = plainObject.toString;
    var plainArray = [];
    var slice = plainArray.slice;
    var concat = plainArray.concat;
    var push = plainArray.push;
    var indexOf = plainArray.indexOf;
    var rkeyEvent = /^key/,
        rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
        rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
        rtypenamespace = /^([^.]*)(?:\.(.+)|)/,
        rnotwhite = (/\S+/g);
    var eventInternal = {
        global: {},
        add: function (elem, types, handler, data, selector) {

            var handleObjIn, eventHandle, tmp, events, t, handleObj, special, handlers, type, namespaces, origType,
                elemData = jAwn.cache.get(elem) || {};

            // Caller can pass in an object of custom data in lieu of the handler
            if (handler.handler) {
                handleObjIn = handler;
                var context = {};
                handler = handleObjIn.handler;
                selector = handleObjIn.selector;
            }

            // If the selector is invalid, throw any exceptions at attach time
            if (selector) {
                find(selector, elem);
            }

            // Make sure that the handler has a unique ID, used to find/remove it later
            if (!handler.guid) {
                handler.guid = 'jAwnGUID' + eventGUID++;
            }

            // Init the element's event structure and main handler, if this is the first
            if (!(events = elemData.events)) {
                events = elemData.events = {};
            }
            if (!(eventHandle = elemData.handle)) {
                eventHandle = elemData.handle = function (e) {
                    // Discard the second event of a eventInternal.trigger() and
                    // when an event is called after a page has unloaded
                    return typeof jAwn !== 'undefined' && eventInternal.triggered !== e.type ? eventInternal.dispatch.apply(elem, arguments) : undefined;
                };
            }

            // Handle multiple events separated by a space
            types = (types || '').match(rnotwhite) || [''];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = origType = tmp[1];
                namespaces = (tmp[2] || '').split('.').sort();

                // There *must* be a type, no attaching namespace-only handlers
                if (!type) {
                    continue;
                }

                // If event changes its type, use the special event handlers for the changed type
                special = eventInternal.special[type] || {};

                // If selector defined, determine special event api type, otherwise given type
                type = (selector ? special.delegateType : special.bindType) || type;

                // Update special based on newly reset type
                special = eventInternal.special[type] || {};

                // handleObj is passed to all event handlers
                handleObj = mergeObjects({
                    type: type,
                    origType: origType,
                    data: data,
                    handler: handler,
                    guid: handler.guid,
                    selector: selector,
                    needsContext: selector && expr.match.needsContext.test(selector),
                    namespace: namespaces.join('.')
                }, handleObjIn);

                // Init the event handler queue if we're the first
                if (!(handlers = events[type])) {
                    handlers = events[type] = [];
                    handlers.delegateCount = 0;

                    // Only use addEventListener if the special events handler returns false
                    if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
                        if (elem.addEventListener) {
                            elem.addEventListener(type, eventHandle, false);
                        }
                    }
                }

                if (special.add) {
                    special.add.call(elem, handleObj);

                    if (!handleObj.handler.guid) {
                        handleObj.handler.guid = handler.guid;
                    }
                }

                // Add to the element's handler list, delegates in front
                if (selector) {
                    handlers.splice(handlers.delegateCount++, 0, handleObj);
                }
                else {
                    handlers.push(handleObj);
                }

                // Keep track of which events have ever been used, for event optimization
                eventInternal.global[type] = true;
            }

        },

        // Detach an event or set of events from an element
        remove: function (elem, types, handler, selector, mappedTypes) {

            var j, origCount, tmp, events, t, handleObj, special, handlers, type, namespaces, origType,
                elemData = jAwn.cache.hasData(elem) && jAwn.cache.get(elem);

            if (!elemData || !(events = elemData.events)) {
                return;
            }

            // Once for each type.namespace in types; type may be omitted
            types = (types || '').match(rnotwhite) || [''];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = origType = tmp[1];
                namespaces = (tmp[2] || '').split('.').sort();

                // Unbind all events (on this namespace, if provided) for the element
                if (!type) {
                    for (type in events) {
                        eventInternal.remove(elem, type + types[t], handler, selector, true);
                    }
                    continue;
                }

                special = eventInternal.special[type] || {};
                type = (selector ? special.delegateType : special.bindType) || type;
                handlers = events[type] || [];
                tmp = tmp[2] && new RegExp('(^|\\.)' + namespaces.join('\\.(?:.*\\.|)') + '(\\.|$)');

                // Remove matching events
                origCount = j = handlers.length;
                while (j--) {
                    handleObj = handlers[j];

                    if ((mappedTypes || origType === handleObj.origType) &&
                        (!handler || handler.guid === handleObj.guid) &&
                        (!tmp || tmp.test(handleObj.namespace)) &&
                        (!selector || selector === handleObj.selector || selector === '**' && handleObj.selector)) {
                        handlers.splice(j, 1);

                        if (handleObj.selector) {
                            handlers.delegateCount--;
                        }
                        if (special.remove) {
                            special.remove.call(elem, handleObj);
                        }
                    }
                }

                // Remove generic event handler if we removed something and no more handlers exist
                // (avoids potential for endless recursion during removal of special event handlers)
                if (origCount && !handlers.length) {
                    if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
                        jAwn.removeEvent(elem, type, elemData.handle);
                    }
                    delete events[type];
                }
            }

            // Remove the commonGUID if it's no longer used
            if (isEmptyObject(events)) {
                delete elemData.handle;
                jAwn.cache.remove(elem, 'events');
            }
        },

        trigger: function (event, data, elem, onlyHandlers) {

            var i, cur, tmp, bubbleType, ontype, handle, special, eventPath = [elem || document],
                type = hasOwn.call(event, 'type') ? event.type : event,
                namespaces = hasOwn.call(event, 'namespace') ? event.namespace.split('.') : [];

            cur = tmp = elem = elem || document;

            // Don't do events on text and comment nodes
            if (elem.nodeType === 3 || elem.nodeType === 8) {
                return;
            }

            // focus/blur morphs to focusin/out; ensure we're not firing them right now
            if (rfocusMorph.test(type + eventInternal.triggered)) {
                return;
            }

            if (type.indexOf('.') >= 0) {
                // Namespaced trigger; create a regexp to match event type in handle()
                namespaces = type.split('.');
                type = namespaces.shift();
                namespaces.sort();
            }
            ontype = type.indexOf(':') < 0 && 'on' + type;

            // Caller can pass in a jAwn.event object, Object, or just an event type string
            event = event[commonGUID] ? event : new jAwn.event(type, isObject(event) && event);

            // Trigger bitmask: & 1 for native handlers; & 2 for custom (always true)
            event.isTrigger = onlyHandlers ? 2 : 3;
            event.namespace = namespaces.join('.');
            event.namespace_re = event.namespace ? new RegExp('(^|\\.)' + namespaces.join('\\.(?:.*\\.|)') + '(\\.|$)') : null;

            // Clean up the event in case it is being reused
            event.result = undefined;
            if (!event.target) {
                event.target = elem;
            }

            // Clone any incoming data and prepend the event, creating the handler arg list
            data = data == null ? [event] : makeArray(data, [event]);

            // Allow special events to draw outside the lines
            special = eventInternal.special[type] || {};
            if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
                return;
            }

            // Determine event propagation path in advance, per W3C events spec (#9951)
            // Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
            if (!onlyHandlers && !special.noBubble && !isWindow(elem)) {

                bubbleType = special.delegateType || type;
                if (!rfocusMorph.test(bubbleType + type)) {
                    cur = cur.parentNode;
                }
                for ( ; cur; cur = cur.parentNode) {
                    eventPath.push(cur);
                    tmp = cur;
                }

                // Only add window if we got to document (e.g., not plain obj or detached DOM)
                if (tmp === (elem.ownerDocument || document)) {
                    eventPath.push(tmp.defaultView || tmp.parentWindow || window);
                }
            }

            // Fire handlers on the event path
            i = 0;
            while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {

                event.type = i > 1 ? bubbleType : special.bindType || type;

                // Custom handler
                handle = (jAwn.cache.get(cur, 'events') || {})[event.type] && jAwn.cache.get(cur, 'handle');
                if (handle) {
                    handle.apply(cur, data);
                }

                // Native handler
                handle = ontype && cur[ontype];
                if (handle && handle.apply && acceptData(cur)) {
                    event.result = handle.apply(cur, data);
                    if (event.result === false) {
                        event.preventDefault();
                    }
                }
            }
            event.type = type;

            // If nobody prevented the default action, do it now
            if (!onlyHandlers && !event.isDefaultPrevented()) {

                if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {

                    // Call a native DOM method on the target with the same name name as the event.
                    // Don't do default actions on window, that's where global variables be (#6170)
                    if (ontype && isFunction(elem[type]) && !isWindow(elem)) {

                        // Don't re-trigger an onFOO event when we call its FOO() method
                        tmp = elem[ontype];

                        if (tmp) {
                            elem[ontype] = null;
                        }

                        // Prevent re-triggering of the same event, since we already bubbled it above
                        eventInternal.triggered = type;
                        elem[type]();
                        eventInternal.triggered = undefined;

                        if (tmp) {
                            elem[ontype] = tmp;
                        }
                    }
                }
            }
            return event.result;
        },

        dispatch: function (nativeEvent) {

            // Make a writable jAwn.event from the native event object
            var event = eventInternal.fix(nativeEvent);

            var i, j, ret, matched, handleObj, handlerQueue,
                args = new Array(arguments.length),
                handlers = (jAwn.cache.get(this, 'events') || {})[event.type] || [],
                special = eventInternal.special[event.type] || {};

            // Use the fix-ed jAwn.event rather than the (read-only) native event
            args[0] = event;
            for (i = 1; i < arguments.length; i++) {
                args[i] = arguments[i];
            }
            event.delegateTarget = this;

            // Call the preDispatch hook for the mapped type, and let it bail if desired
            if (special.preDispatch && special.preDispatch.call(this, event) === false) {
                return;
            }

            // Determine handlers
            handlerQueue = eventInternal.handlers.call(this, event, handlers);

            // Run delegates first; they may want to stop propagation beneath us
            i = 0;
            while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
                event.currentTarget = matched.elem;

                j = 0;
                while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {

                    // Triggered event must either 1) have no namespace, or
                    // 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
                    if (!event.namespace_re || event.namespace_re.test(handleObj.namespace)) {

                        event.handleObj = handleObj;
                        event.data = handleObj.data;

                        ret = ((eventInternal.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);

                        if (ret !== undefined) {
                            if ((event.result = ret) === false) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                    }
                }
            }

            // Call the postDispatch hook for the mapped type
            if (special.postDispatch) {
                special.postDispatch.call(this, event);
            }
            return event.result;
        },

        handlers: function (event, handlers) {
            var i, matches, sel, handleObj,
                handlerQueue = [],
                delegateCount = handlers.delegateCount,
                cur = event.target;

            // Find delegate handlers
            // Black-hole SVG <use> instance trees (#13180)
            // Avoid non-left-click bubbling in Firefox (#3861)
            if (delegateCount && cur.nodeType && (!event.button || event.type !== 'click')) {

                for ( ; cur !== this; cur = cur.parentNode || this) {

                    // Don't check non-elements (#13208)
                    // Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
                    if (cur.nodeType === 1 && (cur.disabled !== true || event.type !== 'click')) {
                        matches = [];
                        for ( i = 0; i < delegateCount; i++) {
                            handleObj = handlers[i];

                            // Don't conflict with Object.prototype properties (#13203)
                            sel = handleObj.selector + ' ';

                            if (matches[sel] === undefined) {
                                matches[sel] = handleObj.needsContext ? getIndex(queryAll(sel, this), cur) >= 0 : find(sel, this, null, [cur]).length;
                            }
                            if (matches[sel]) {
                                matches.push(handleObj);
                            }
                        }
                        if (matches.length) {
                            handlerQueue.push({ elem: cur, handlers: matches });
                        }
                    }
                }
            }

            // Add the remaining (directly-bound) handlers
            if (delegateCount < handlers.length) {
                handlerQueue.push({ elem: this, handlers: handlers.slice(delegateCount) });
            }
            return handlerQueue;
        },

        addProp: function (name, hook) {
            Object.defineProperty(jAwn.event.prototype, name, {
                enumerable: true,
                configurable: true,

                get: isFunction(hook) ?
                    function () {
                        if (this.originalEvent) {
                            return hook(this.originalEvent);
                        }
                    } :
                    function () {
                        if (this.originalEvent) {
                            return this.originalEvent[name];
                        }
                    },

                set: function (value) {
                    Object.defineProperty(this, name, {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: value
                    });
                }
            });
        },

        fix: function (originalEvent) {
            return originalEvent[commonGUID] ? originalEvent : new jAwn.event(originalEvent);
        },

        special: {
            load: {
                // Prevent triggered image.load events from bubbling to window.load
                noBubble: true
            },
            focus: {
                // Fire native event if possible so blur/focus sequence is correct
                trigger: function () {
                    if (this !== safeActiveElement() && this.focus) {
                        this.focus();
                        return false;
                    }
                },
                delegateType: 'focusin'
            },
            blur: {
                trigger: function () {
                    if (this === safeActiveElement() && this.blur) {
                        this.blur();
                        return false;
                    }
                },
                delegateType: 'focusout'
            },
            click: {
                // For checkbox, fire native event so checked state will be right
                trigger: function () {
                    if (this.type === 'checkbox' && this.click && checkNodeType(this, 'input')) {
                        this.click();
                        return false;
                    }
                },

                // For cross-browser consistency, don't fire native .click() on links
                _default: function (event) {
                    return checkNodeType(event.target, 'a');
                }
            },

            beforeunload: {
                postDispatch: function (event) {

                    // Support: Firefox 20+
                    // Firefox doesn't alert if the returnValue field is not set.
                    if (event.result !== undefined && event.originalEvent) {
                        event.originalEvent.returnValue = event.result;
                    }
                }
            }
        },

        simulate: function (type, elem, event, bubble) {
            // Piggyback on a donor event to simulate a different one
            // Used only for `focus(in | out)` events
            var e = mergeObjects(
                new jAwn.event(),
                event,
                {
                    type: type,
                    isSimulated: true
                }
            );
            eventInternal.trigger(e, null, elem);
        }
    };

    // jAwn.event is based on DOM3 Events as specified by the ECMAScript Language Binding
    // http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    jAwn.event = function (src, props) {
        // Allow instantiation without the 'new' keyword
        if (!(this instanceof jAwn.event)) {
            return new jAwn.event(src, props);
        }

        // Event object
        if (src && src.type) {
            this.originalEvent = src;
            this.type = src.type;

            // Events bubbling up the document may have been marked as prevented
            // by a handler lower down the tree; reflect the correct value.
            // Support: Android < 4.0
            this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;

            // Create target properties
            // Support: Safari <=6 - 7 only
            // Target should not be a text node (#504, #13143)
            this.target = (src.target && src.target.nodeType === 3) ? src.target.parentNode : src.target;
            this.currentTarget = src.currentTarget;
            this.relatedTarget = src.relatedTarget;

        // Event type
        }
        else {
            this.type = src;
        }

        // Put explicitly provided properties onto the event object
        if (props) {
            mergeObjects(this, props);
        }

        // Create a timestamp if incoming event doesn't have one
        this.timeStamp = src && src.timeStamp || Date.now();

        // Mark it as fixed
        this[commonGUID] = true;
    };

    jAwn.event.prototype = {
        constructor: jAwn.event,
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse,
        isSimulated: false,
        preventDefault: function () {
            var e = this.originalEvent;
            this.isDefaultPrevented = returnTrue;
            if (e && !this.isSimulated) {
                e.preventDefault();
            }
        },
        stopPropagation: function () {
            var e = this.originalEvent;
            this.isPropagationStopped = returnTrue;
            if (e && !this.isSimulated) {
                e.stopPropagation();
            }
        },
        stopImmediatePropagation: function () {
            var e = this.originalEvent;
            this.isImmediatePropagationStopped = returnTrue;
            if (e && !this.isSimulated) {
                e.stopImmediatePropagation();
            }
            this.stopPropagation();
        }
    };

    function getInternal (property) {

        if (isDefined(property) && isNotEmptyString(property)) {
            return eventInternal[property];
        }
        else {
            return eventInternal;
        }

    };

    // Public Methods
    jAwn.removeEvent = function (elem, type, handle) {

        if (elem.removeEventListener) {
            elem.removeEventListener(type, handle, false);
        }

    };

    jAwn.on = function (elements, types, selector, data, fn, one) {

        var origFn, type;

        // Types can be a map of types/handlers
        if (isObject(types)) {
            // (types-Object, selector, data)
            if (isString(selector)) {
                // (types-Object, data)
                data = data || selector;
                selector = undefined;
            }
            for (type in types) {
                jAwn.on(elements, type, selector, data, types[type], one);
            }
            return elements;
        }

        if (data == null && fn == null) {
            // (types, fn)
            fn = selector;
            data = selector = undefined;
        }
        else if (fn == null) {
            if (isString(selector)) {
                // (types, selector, fn)
                fn = data;
                data = undefined;
            }
            else {
                // (types, data, fn)
                fn = data;
                data = selector;
                selector = undefined;
            }
        }
        if (fn === false) {
            fn = returnFalse;
        }
        else if (!fn) {
            return elements;
        }

        if (one === 1) {
            origFn = fn;
            fn = function (event) {
                // Can use an empty set, since event contains the info
                jAwn.off(event);
                return origFn.apply(this, arguments);
            };

            // Use same guid so caller can remove using origFn
            fn.guid = origFn.guid || (origFn.guid = 'jAwnGUID' + eventGUID++);
        }
        if (isArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.add(elements[index], types, fn, data, selector);
            }
        }
        else {
            eventInternal.add(elements, types, fn, data, selector);
        }

    };

    jAwn.one = function (elements, types, selector, data, fn) {

        return jAwn.on(elements, types, selector, data, fn, 1);

    };

    jAwn.off = function (elements, types, selector, fn) {

        var handleObj, type;
        if (elements && elements.preventDefault && elements.handleObj) {
            // (event)  dispatched jAwn.event
            handleObj = elements.handleObj;
            jAwn.off(elements.delegateTarget,
                handleObj.namespace ? handleObj.origType + '.' + handleObj.namespace : handleObj.origType,
                handleObj.selector,
                handleObj.handler
            );
            return elements;
        }
        if (isObject(types)) {
            // (types-object [, selector])
            for (type in types) {
                jAwn.off(elements, type, selector, types[type]);
            }
            return elements;
        }
        if (selector === false || isFunction(selector)) {
            // (types [, fn])
            fn = selector;
            selector = undefined;
        }
        if (fn === false) {
            fn = returnFalse;
        }
        if (isArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.remove(elements[index], types, fn, selector);
            }
        }
        else {
            eventInternal.remove(elements, types, fn, selector);
        }

    };

    jAwn.trigger = function (elements, type, data) {

        if (isArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.trigger(type, data, elements[index]);
            }
        }
        else {
            eventInternal.trigger(type, data, elements);
        }

    };

    jAwn.triggerHandler = function (element, type, data) {

        if (element) {
            return eventInternal.trigger(type, data, element, true);
        }

    };

    // Private Methods
    // Custom function to support $.find
    function find (selector, context, results, seed) {

        var elem, nodeType, i = 0;
        results = results || [];
        context = context || document;

        // Same basic safeguard as Sizzle
        if (!selector || !isString(selector)) {
            return results;
        }

        // Early return if context is not an element or document
        if ((nodeType = context.nodeType) !== 1 && nodeType !== 9) {
            return [];
        }
        if (seed) {
            while ((elem = seed[i++])) {
                if (elem.matches(selector)) {
                    results.push(elem);
                }
            }
        }
        else {
            mergeArray(results, queryAll(selector, context));
        }
        return results;

    };

    function getIndex (elements, elem) {

        // No argument, return index in parent
        if (!elem) {
            return (elements[0] && elements[0].parentNode) ? getAllSibling(elements[0], siblingType.Previous).length : -1;
        }

        // index in selector
        if (isString(elem)) {
            return indexOf.call(elem, elements[0]);
        }

        // Locate the position of the desired element
        return indexOf.call(elements, elem);

    }

    function makeArray (arr, results) {

        var ret = results || [];
        if (arr != null) {
            if (isArrayLike(Object(arr))) {
                mergeArray(ret, isString(arr) ? [arr] : arr);
            }
            else {
                push.call(ret, arr);
            }
        }
        return ret;

    };

    function isArrayLike (obj) {

        var length = obj.length,
            type = getType(obj);
        if (isFunction(type) || isWindow(obj)) {
            return false;
        }
        if (obj.nodeType === 1 && length) {
            return true;
        }
        return type === 'array' || length === 0 || isNumber(length) && length > 0 && (length - 1) in obj;

    };

    function contains (a, b) {

        var adown = a.nodeType === 9 ? a.documentElement : a, bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && adown.contains(bup));

    }

    function returnTrue () {

        return true;

    };

    function returnFalse () {

        return false;

    };

    function safeActiveElement () {

        try {
            return document.activeElement;
        }
        catch (err) {}

    };

    // Includes all common event props including KeyEvent and MouseEvent specific props
    var property, value;
    var eventProperties = {
        altKey: true,
        bubbles: true,
        cancelable: true,
        changedTouches: true,
        ctrlKey: true,
        detail: true,
        eventPhase: true,
        metaKey: true,
        pageX: true,
        pageY: true,
        shiftKey: true,
        view: true,
        "char": true,
        charCode: true,
        key: true,
        keyCode: true,
        button: true,
        buttons: true,
        clientX: true,
        clientY: true,
        offsetX: true,
        offsetY: true,
        pointerId: true,
        pointerType: true,
        screenX: true,
        screenY: true,
        targetTouches: true,
        toElement: true,
        touches: true,

        which: function (event) {
            var button = event.button;

            // Add which for key events
            if (event.which == null && rkeyEvent.test(event.type)) {
                return event.charCode != null ? event.charCode : event.keyCode;
            }

            // Add which for click: 1 === left; 2 === middle; 3 === right
            if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
                return (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
            }

            return event.which;
        }
    };
    for (property in eventProperties) {
        value = eventProperties[property];
        eventInternal.addProp(property, value)
    }

    // Generate special events
    // Create mouseenter/leave events using mouseover/out and event-time checks
    // Support: Chrome 15+
    var mouseEvents = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout',
        pointerenter: 'pointerover',
        pointerleave: 'pointerout'
    };
    for (property in mouseEvents) {
        value = mouseEvents[property];
        (function (property, value) {
            eventInternal.special[property] = {
                delegateType: value,
                bindType: value,
                handle: function (event) {
                    var ret,
                        target = this,
                        related = event.relatedTarget,
                        handleObj = event.handleObj;

                    // For mousenter/leave call the handler if related is outside the target.
                    // NB: No relatedTarget if the mouse left/entered the browser window
                    if (!related || (related !== target && !contains(target, related))) {
                        event.type = handleObj.origType;
                        ret = handleObj.handler.apply(this, arguments);
                        event.type = value;
                    }
                    return ret;
                }
            };
        }(property, value));
    }

    // Create 'bubbling' focus and blur events
    // Support: Firefox, Chrome, Safari
    if (!focusinBubbles) {
        var bubbleEvents = {
            focus: 'focusin',
            blur: 'focusout'
        };
        for (property in bubbleEvents) {
            value = bubbleEvents[property];
            (function (property, value) {
                // Attach a single capturing handler on the document while someone wants focusin/focusout
                var handler = function (event) {
                    eventInternal.simulate(value, event.target, eventInternal.fix(event), true);
                };
                eventInternal.special[value] = {
                    setup: function () {
                        var doc = this.ownerDocument || this, attaches = jAwn.cache.access(doc, value);
                        if (!attaches) {
                            doc.addEventListener(property, handler, true);
                        }
                        jAwn.cache.access(doc, value, (attaches || 0) + 1);
                    },
                    teardown: function () {
                        var doc = this.ownerDocument || this, attaches = jAwn.cache.access(doc, value) - 1;
                        if (!attaches) {
                            doc.removeEventListener(property, handler, true);
                            jAwn.cache.remove(doc, value);

                        }
                        else {
                            jAwn.cache.access(doc, value, attaches);
                        }
                    }
                };
            }(property, value));
        }
    }

	// Functions and stuff

    // Retrieve elements with a selector, optional context
    function queryAll (selector, context) {

		// Determine if context was not passed in
        if (isNotDefined(context)) {
            context = document;
        }
        return nodeListToArray(context.querySelectorAll(selector));

    };

    // Converts a node list into an array
    function nodeListToArray (nodeList) {

        return [].slice.call(nodeList, 0);

    };

    // Retrieve all previous, all next or all siblings of an element, optional selector to filter
    var siblingType = {
        Previous: 'Previous',
        Next: 'Next',
        All: 'All'
    };
    function getAllSibling (context, type, selector) {

        var match = [];
        if (isNotDefined(context)) {
            return match;
        }
        if (type == siblingType.Next || type == siblingType.Previous) {
            var siblingProperty = '';
            if (type == siblingType.Next) {
                siblingProperty = 'nextSibling';
            }
            else if (type == siblingType.Previous) {
                siblingProperty = 'previousSibling';
            }
            while (context = context[siblingProperty]) {
                if (isDefined(selector)) {
                    if (context.matches(selector)) {
                        match.push(context);
                    }
                }
                else {
                    match.push(context);
                }
            }
        }
        else if (type == siblingType.All) {
            var currentSibling = context.parentNode.firstChild;
            do {
                if (currentSibling == context) {
                    continue;
                }
                if (isDefined(selector)) {
                    if (currentSibling.matches(selector)) {
                        match.push(currentSibling);
                    }
                }
                else {
                    match.push(currentSibling);
                }
            } while (currentSibling = currentSibling.nextSibling)
        }
        return match;

    };

    // Remove an element or array of elements from the DOM, this will off all events and remove cache
    jAwn.removeElements = function (elements, ignoreData) {

        // Initialize and sanity check
        var removedChildren = []
        if (isNotDefined(elements)) {
            return removedChildren;
        }

        // Convert elements to an array, if necessary.
        if (!elements.length) {
            elements = [elements];
        }

        // Loop over each element to be removed, cleanup their data and events and remove element
        var removedChild, element, childElements, index = 0, length = elements.length;
        for ( ; index < length; index++) {
            element = elements[index];
            if (ignoreData != true && element.nodeType === 1) {
                // Get all elements inside element to be removed and clean up their data and events as well
                // INFO: getElementsByTagName is MUCH faster in this context than querySelectorAll (NodeList - live vs static)
                childElements = element.getElementsByTagName('*');

                // Merge top element back in for clean up
                childElements = mergeArray([element], childElements);
                cleanElementData(childElements);
            }
            if (isDefined(element.parentNode)) {
                removedChild = element.parentNode.removeChild(element);
                removedChildren.push(removedChild);
            }
        }
        return removedChildren;

    };

    // Removes element or array of elements from DOM but does not clean up events or data associated with them
    jAwn.detach = function (elements) {

        return jAwn.removeElements(elements, true);

    };

    // Merge the contents of two or more objects together into the first object
    function mergeObjects () {

        var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

        // Handle a deep copy situation
        if (isBoolean(target)) {
            deep = target;

            // Skip the boolean and the target
            target = arguments[i] || {};
            i++;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (!isObject(target) && !isFunction(target)) {
            target = {};
        }

        // Extend object itself if only one argument is passed
        if (i === length) {
            target = this;
            i--;
        }

        for ( ; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && isArray(src) ? src : [];

                        }
                        else {
                            clone = src && isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = mergeObjects(deep, clone, copy);

                    // Don't bring in undefined values
                    }
                    else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;

    };

    // Determines if an object is a plain old javascript object
    function isPlainObject (object) {

        if (getType(object) !== 'object' || object.nodeType || isWindow(object)) {
            return false;
        }
        if (object.constructor && !hasOwn.call(object.constructor.prototype, 'isPrototypeOf')) {
            return false;
        }
        return true;

    };

    // Determines if an element matches passed in type
    function checkNodeType (element, name) {

        return element.nodeName && element.nodeName.toLowerCase() === name.toLowerCase();

    };

    // Returns type of an object
    function getType (object) {

        if (object == null) {
            return object + '';
        }

        // Support: Android < 4.0, iOS < 6 (functionish RegExp)
        return isObject(object) || isFunction(object) ? plainObject[toString.call(object)] || 'object' : typeof object;

    };

    // Merge the contents of two arrays together into the first array, pass empty array as first argument to clone an array
    function mergeArray (first, second) {

        // Initialize
        var length = +second.length, index = 0, newLength = first.length;

        // Merge
        for ( ; index < length; index++) {
            first[newLength++] = second[index];
        }
        first.length = newLength;

        // Return
        return first;
    };

    // Determines if object is window object
    function isWindow (object) {

        return isDefined(object) && object === object.window;

    };

    // Determines if object is an object
    function isObject (object) {

        return typeof object === 'object';

    };

    // Determines if object is a function
    function isFunction (object) {

        return typeof object === 'function';

    };

    // Determines if object is a string
    function isString (object) {

        return typeof object === 'string';

    };

    // Determines if object is a boolean
    function isBoolean (object) {

        return typeof object === 'boolean';

    };

    // Determines if object is a number
    function isNumber (object) {

        return typeof object === 'number';

    };

    // Determines if object is an array
    function isArray (object) {

        return Array.isArray(object);

    };

    // Determines if value defined and not null
    function isDefined (value) {

        return typeof value !== 'undefined' && value != null;

    };

    // Determines if value is undefined or null
    function isNotDefined (value) {

        return !isDefined(value);

    };

    // Determines if object is empty
    function isEmptyObject (object) {

        var property;
        for (property in object) {
            return false;
        }
        return true;

    };

    // Determines if string is empty
    function isEmptyString (value) {

        return value === '';

    };

    // Determines if string is not empty
    function isNotEmptyString (value) {

        return !isEmptyString(value);

    };

} (window.jAwn = window.jAwn || {}, window, document));
