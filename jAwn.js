(function (jAwn, window, document, Common, Cache, undefined) {

    // Private Variables
    var EventGUID = 0;
    var CommonGUID = 'jAwn' + ('2.1.1' + Math.random()).replace(/\D/g, '');
    var expr = {
        attrHandle: {},
        match: {
            bool: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped)$/i,
            needsContext: /^[\x20\t\r\n\f]*[>+~]/
        }
    };
    var FocusinBubbles = 'onfocusin' in window;
    var PlainObject = {};
    var HasOwn = PlainObject.hasOwnProperty;
    var PlainArray = [];
    var slice = PlainArray.slice;
    var concat = PlainArray.concat;
    var push = PlainArray.push;
    var indexOf = PlainArray.indexOf;
    var rkeyEvent = /^key/,
        rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
        rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
        rtypenamespace = /^([^.]*)(?:\.(.+)|)/,
        rnotwhite = (/\S+/g);
    var eventInternal = {
        global: {},
        add: function (elem, types, handler, data, selector) {

            var handleObjIn, eventHandle, tmp, events, t, handleObj, special, handlers, type, namespaces, origType,
                elemData = Cache.Get(elem) || {};

            // Caller can pass in an object of custom data in lieu of the handler
            if (handler.handler) {
                handleObjIn = handler;
                var context = {};
                handler = handleObjIn.handler;
                selector = handleObjIn.selector;
            }

            // If the selector is invalid, throw any exceptions at attach time
            if (selector) {
                Find(selector, elem);
            }

            // Make sure that the handler has a unique ID, used to find/remove it later
            if (!handler.guid) {
                handler.guid = 'jAwnGUID' + EventGUID++;
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
                handleObj = MergeObjects({
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
                elemData = Cache.HasData(elem) && Cache.Get(elem);

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
                        jAwn.RemoveEvent(elem, type, elemData.handle);
                    }
                    delete events[type];
                }
            }

            // Remove the CommonGUID if it's no longer used
            if (IsEmptyObject(events)) {
                delete elemData.handle;
                Cache.Remove(elem, 'events');
            }
        },

        trigger: function (event, data, elem, onlyHandlers) {

            var i, cur, tmp, bubbleType, ontype, handle, special, eventPath = [elem || document],
                type = HasOwn.call(event, 'type') ? event.type : event,
                namespaces = HasOwn.call(event, 'namespace') ? event.namespace.split('.') : [];

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

            // Caller can pass in a jAwn.Event object, Object, or just an event type string
            event = event[CommonGUID] ? event : new jAwn.Event(type, IsObject(event) && event);

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
            data = data == null ? [event] : MakeArray(data, [event]);

            // Allow special events to draw outside the lines
            special = eventInternal.special[type] || {};
            if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
                return;
            }

            // Determine event propagation path in advance, per W3C events spec (#9951)
            // Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
            if (!onlyHandlers && !special.noBubble && !IsWindow(elem)) {

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
                handle = (Cache.Get(cur, 'events') || {})[event.type] && Cache.Get(cur, 'handle');
                if (handle) {
                    handle.apply(cur, data);
                }

                // Native handler
                handle = ontype && cur[ontype];
                if (handle && handle.apply && AcceptData(cur)) {
                    event.result = handle.apply(cur, data);
                    if (event.result === false) {
                        event.preventDefault();
                    }
                }
            }
            event.type = type;

            // If nobody prevented the default action, do it now
            if (!onlyHandlers && !event.isDefaultPrevented()) {

                if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && AcceptData(elem)) {

                    // Call a native DOM method on the target with the same name name as the event.
                    // Don't do default actions on window, that's where global variables be (#6170)
                    if (ontype && IsFunction(elem[type]) && !IsWindow(elem)) {

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

            // Make a writable jAwn.Event from the native event object
            var event = eventInternal.fix(nativeEvent);

            var i, j, ret, matched, handleObj, handlerQueue,
                args = new Array(arguments.length),
                handlers = (Cache.Get(this, 'events') || {})[event.type] || [],
                special = eventInternal.special[event.type] || {};

            // Use the fix-ed jAwn.Event rather than the (read-only) native event
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
                                matches[sel] = handleObj.needsContext ? Index(QueryAll(sel, this), cur) >= 0 : Find(sel, this, null, [cur]).length;
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
            Object.defineProperty(jAwn.Event.prototype, name, {
                enumerable: true,
                configurable: true,

                get: IsFunction(hook) ?
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
            return originalEvent[CommonGUID] ? originalEvent : new jAwn.Event(originalEvent);
        },

        special: {
            load: {
                // Prevent triggered image.load events from bubbling to window.load
                noBubble: true
            },
            focus: {
                // Fire native event if possible so blur/focus sequence is correct
                trigger: function () {
                    if (this !== SafeActiveElement() && this.focus) {
                        this.focus();
                        return false;
                    }
                },
                delegateType: 'focusin'
            },
            blur: {
                trigger: function () {
                    if (this === SafeActiveElement() && this.blur) {
                        this.blur();
                        return false;
                    }
                },
                delegateType: 'focusout'
            },
            click: {
                // For checkbox, fire native event so checked state will be right
                trigger: function () {
                    if (this.type === 'checkbox' && this.click && CheckNodeType(this, 'input')) {
                        this.click();
                        return false;
                    }
                },

                // For cross-browser consistency, don't fire native .click() on links
                _default: function (event) {
                    return CheckNodeType(event.target, 'a');
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
            var e = MergeObjects(
                new jAwn.Event(),
                event,
                {
                    type: type,
                    isSimulated: true
                }
            );
            eventInternal.trigger(e, null, elem);
        }
    };

    // jAwn.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
    // http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    jAwn.Event = function (src, props) {
        // Allow instantiation without the 'new' keyword
        if (!(this instanceof jAwn.Event)) {
            return new jAwn.Event(src, props);
        }

        // Event object
        if (src && src.type) {
            this.originalEvent = src;
            this.type = src.type;

            // Events bubbling up the document may have been marked as prevented
            // by a handler lower down the tree; reflect the correct value.
            // Support: Android < 4.0
            this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? ReturnTrue : ReturnFalse;

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
            MergeObjects(this, props);
        }

        // Create a timestamp if incoming event doesn't have one
        this.timeStamp = src && src.timeStamp || Date.now();

        // Mark it as fixed
        this[CommonGUID] = true;
    };

    jAwn.Event.prototype = {
        constructor: jAwn.Event,
        isDefaultPrevented: ReturnFalse,
        isPropagationStopped: ReturnFalse,
        isImmediatePropagationStopped: ReturnFalse,
        isSimulated: false,
        preventDefault: function () {
            var e = this.originalEvent;
            this.isDefaultPrevented = ReturnTrue;
            if (e && !this.isSimulated) {
                e.preventDefault();
            }
        },
        stopPropagation: function () {
            var e = this.originalEvent;
            this.isPropagationStopped = ReturnTrue;
            if (e && !this.isSimulated) {
                e.stopPropagation();
            }
        },
        stopImmediatePropagation: function () {
            var e = this.originalEvent;
            this.isImmediatePropagationStopped = ReturnTrue;
            if (e && !this.isSimulated) {
                e.stopImmediatePropagation();
            }
            this.stopPropagation();
        }
    };

    // Public Methods
    jAwn.RemoveEvent = function (elem, type, handle) {

        if (elem.removeEventListener) {
            elem.removeEventListener(type, handle, false);
        }

    };

    jAwn.GetInternal = function (property) {

        if (IsDefined(property) && IsNotEmptyString(property)) {
            return eventInternal[property];
        }
        else {
            return eventInternal;
        }

    };

    jAwn.On = function (elements, types, selector, data, fn, one) {

        var origFn, type;

        // Types can be a map of types/handlers
        if (IsObject(types)) {
            // (types-Object, selector, data)
            if (IsString(selector)) {
                // (types-Object, data)
                data = data || selector;
                selector = undefined;
            }
            for (type in types) {
                jAwn.On(elements, type, selector, data, types[type], one);
            }
            return elements;
        }

        if (data == null && fn == null) {
            // (types, fn)
            fn = selector;
            data = selector = undefined;
        }
        else if (fn == null) {
            if (IsString(selector)) {
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
            fn = ReturnFalse;
        }
        else if (!fn) {
            return elements;
        }

        if (one === 1) {
            origFn = fn;
            fn = function (event) {
                // Can use an empty set, since event contains the info
                jAwn.Off(event);
                return origFn.apply(this, arguments);
            };

            // Use same guid so caller can remove using origFn
            fn.guid = origFn.guid || (origFn.guid = 'jAwnGUID' + EventGUID++);
        }
        if (IsArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.add(elements[index], types, fn, data, selector);
            }
        }
        else {
            eventInternal.add(elements, types, fn, data, selector);
        }

    };

    jAwn.One = function (elements, types, selector, data, fn) {

        return jAwn.On(elements, types, selector, data, fn, 1);

    };

    jAwn.Off = function (elements, types, selector, fn) {

        var handleObj, type;
        if (elements && elements.preventDefault && elements.handleObj) {
            // (event)  dispatched jAwn.Event
            handleObj = elements.handleObj;
            jAwn.Off(elements.delegateTarget,
                handleObj.namespace ? handleObj.origType + '.' + handleObj.namespace : handleObj.origType,
                handleObj.selector,
                handleObj.handler
            );
            return elements;
        }
        if (IsObject(types)) {
            // (types-object [, selector])
            for (type in types) {
                jAwn.Off(elements, type, selector, types[type]);
            }
            return elements;
        }
        if (selector === false || IsFunction(selector)) {
            // (types [, fn])
            fn = selector;
            selector = undefined;
        }
        if (fn === false) {
            fn = ReturnFalse;
        }
        if (IsArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.remove(elements[index], types, fn, selector);
            }
        }
        else {
            eventInternal.remove(elements, types, fn, selector);
        }

    };

    jAwn.Trigger = function (elements, type, data) {

        if (IsArray(elements)) {
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                eventInternal.trigger(type, data, elements[index]);
            }
        }
        else {
            eventInternal.trigger(type, data, elements);
        }

    };

    jAwn.TriggerHandler = function (element, type, data) {

        if (element) {
            return eventInternal.trigger(type, data, element, true);
        }

    };

    jAwn.GetNextEventGUID = function () {

        return EventGUID++;

    };

    // Private Methods
    // Custom function to support $.find
    function Find (selector, context, results, seed) {

        var elem, nodeType, i = 0;
        results = results || [];
        context = context || document;

        // Same basic safeguard as Sizzle
        if (!selector || !IsString(selector)) {
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
            MergeArray(results, QueryAll(selector, context));
        }
        return results;

    };

    function Index (elements, elem) {

        // No argument, return index in parent
        if (!elem) {
            return (elements[0] && elements[0].parentNode) ? GetAllSibling(elements[0], SiblingType.Previous).length : -1;
        }

        // index in selector
        if (IsString(elem)) {
            return indexOf.call(elem, elements[0]);
        }

        // Locate the position of the desired element
        return indexOf.call(elements, elem);

    }

    function MakeArray (arr, results) {

        var ret = results || [];
        if (arr != null) {
            if (IsArrayLike(Object(arr))) {
                MergeArray(ret, IsString(arr) ? [arr] : arr);
            }
            else {
                push.call(ret, arr);
            }
        }
        return ret;

    };

    function IsArrayLike (obj) {

        var length = obj.length,
            type = GetType(obj);
        if (IsFunction(type) || IsWindow(obj)) {
            return false;
        }
        if (obj.nodeType === 1 && length) {
            return true;
        }
        return type === 'array' || length === 0 || IsNumber(length) && length > 0 && (length - 1) in obj;

    };

    function AcceptData (owner) {

        // Accepts only:
        //  - Node
        //    - Node.ELEMENT_NODE
        //    - Node.DOCUMENT_NODE
        //  - Object
        //    - Any
        return owner.nodeType === 1 || owner.nodeType === 9 || !(+owner.nodeType);

    };

    function Contains (a, b) {

        var adown = a.nodeType === 9 ? a.documentElement : a, bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && adown.contains(bup));

    }

    function ReturnTrue () {

        return true;

    };

    function ReturnFalse () {

        return false;

    };

    function SafeActiveElement () {

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
                    if (!related || (related !== target && !Contains(target, related))) {
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
    if (!FocusinBubbles) {
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
                        var doc = this.ownerDocument || this, attaches = Cache.Access(doc, value);
                        if (!attaches) {
                            doc.addEventListener(property, handler, true);
                        }
                        Cache.Access(doc, value, (attaches || 0) + 1);
                    },
                    teardown: function () {
                        var doc = this.ownerDocument || this, attaches = Cache.Access(doc, value) - 1;
                        if (!attaches) {
                            doc.removeEventListener(property, handler, true);
                            Cache.Remove(doc, value);

                        }
                        else {
                            Cache.Access(doc, value, attaches);
                        }
                    }
                };
            }(property, value));
        }
    }

	// Functions and stuff
	
    var SiblingType = {
        Previous: 'Previous',
        Next: 'Next',
        All: 'All'
    };

    // Retrieve elements with a selector, optional context
    function QueryAll (selector, context, fromParent) {

		// Determine if context was not passed in at all but fromParent was
        if (IsNotDefined(context)) {
            context = document;
        }
        if (fromParent) {
            context = parent.document;
        }
        return NodeListToArray(context.querySelectorAll(selector));

    };

    // Converts a node list into an array
    function NodeListToArray (nodeList) {

        return [].slice.call(nodeList, 0);

    };

    // Retrieve all previous, all next or all siblings of an element, optional selector to filter
    function GetAllSibling (context, type, selector) {

        var match = [];
        if (IsNotDefined(context)) {
            return match;
        }
        if (type == SiblingType.Next || type == SiblingType.Previous) {
            var siblingProperty = '';
            if (type == SiblingType.Next) {
                siblingProperty = 'nextSibling';
            }
            else if (type == SiblingType.Previous) {
                siblingProperty = 'previousSibling';
            }
            while (context = context[siblingProperty]) {
                if (IsDefined(selector)) {
                    if (context.matches(selector)) {
                        match.push(context);
                    }
                }
                else {
                    match.push(context);
                }
            }
        }
        else if (type == SiblingType.All) {
            var currentSibling = context.parentNode.firstChild;
            do {
                if (currentSibling == context) {
                    continue;
                }
                if (IsDefined(selector)) {
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
    jAwn.RemoveElement = function (elements, ignoreData, ignoreDelegatedData) {

        // Initialize and sanity check
        var removedChildren = []
        if (IsNotDefined(elements)) {
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
                childElements = MergeArray([element], childElements);
                Cache.CleanElementData(childElements, ignoreDelegatedData);
            }
            if (IsDefined(element.parentNode)) {
                removedChild = element.parentNode.removeChild(element);
                removedChildren.push(removedChild);
            }
        }
        return removedChildren;

    };

    // Merge the contents of two or more objects together into the first object
    function MergeObjects () {

        var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

        // Handle a deep copy situation
        if (IsBoolean(target)) {
            deep = target;

            // Skip the boolean and the target
            target = arguments[i] || {};
            i++;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (!IsObject(target) && !IsFunction(target)) {
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
                    if (deep && copy && (IsPlainObject(copy) || (copyIsArray = IsArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && IsArray(src) ? src : [];

                        }
                        else {
                            clone = src && IsPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = MergeObjects(deep, clone, copy);

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
    var PlainObject = {};
    var HasOwn = PlainObject.hasOwnProperty;
    var ToString = PlainObject.toString;
    function IsPlainObject (object) {

        if (GetType(object) !== 'object' || object.nodeType || IsWindow(object)) {
            return false;
        }
        if (object.constructor && !HasOwn.call(object.constructor.prototype, 'isPrototypeOf')) {
            return false;
        }
        return true;

    };

    // Determines if an element matches passed in type
    function CheckNodeType (element, name) {

        return element.nodeName && element.nodeName.toLowerCase() === name.toLowerCase();

    };

    // Returns type of an object
    function GetType (object) {

        if (object == null) {
            return object + '';
        }

        // Support: Android < 4.0, iOS < 6 (functionish RegExp)
        return IsObject(object) || IsFunction(object) ? PlainObject[ToString.call(object)] || 'object' : typeof object;

    };

    // Merge the contents of two arrays together into the first array, pass empty array as first argument to clone an array
    function MergeArray (first, second) {

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
    function IsWindow (object) {

        return IsDefined(object) && object === object.window;

    };

    // Determines if object is an object
    function IsObject (object) {

        return typeof object === 'object';

    };

    // Determines if object is a function
    function IsFunction (object) {

        return typeof object === 'function';

    };

    // Determines if object is a string
    function IsString (object) {

        return typeof object === 'string';

    };

    // Determines if object is a boolean
    function IsBoolean (object) {

        return typeof object === 'boolean';

    };

    // Determines if object is a number
    function IsNumber (object) {

        return typeof object === 'number';

    };

    // Determines if object is an array
    function IsArray (object) {

        return Array.isArray(object);

    };

    // Determines if value defined and not null
    function IsDefined (value) {

        return typeof value !== 'undefined' && value != null;

    };

    // Determines if value is undefined or null
    function IsNotDefined (value) {

        return !IsDefined(value);

    };

    // Determines if object is empty
    function IsEmptyObject (object) {

        var property;
        for (property in object) {
            return false;
        }
        return true;

    };

    // Determines if string is empty
    function IsEmptyString (value) {

        return value === '';

    };

    // Determines if string is not empty
    function IsNotEmptyString (value) {

        return !IsEmptyString(value);

    };

} (window.jAwn = window.jAwn || {}, window, document, Common, Cache));
