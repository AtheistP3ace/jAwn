# jAwn

**jawn**

/jôn/

_noun `US` dialect_
> (chiefly in eastern Pennsylvania) used to refer to a thing, place, person, or **event** that one need not or cannot give a specific name to.

_Everything jQuery events offers without all the jQuery._

### jAwn.On( elements, events [, selector ] [, data ], handler )
### jAwn.On( elements, events [, selector ] [, data ] )

### Event names and namespaces

Any event names can be used for the events argument. jAwn will pass through the browser's standard JavaScript event types, calling the handler function when the browser generates events due to user actions such as click. In addition, the `jAwn.Trigger()` method can trigger both standard browser event names and custom event names to call attached handlers. Event names should only contain alphanumerics, underscore, and colon characters.

An event name can be qualified by event namespaces that simplify removing or triggering the event. For example, "`click.myPlugin.simple"` defines both the myPlugin and simple namespaces for this particular click event. A click event handler attached via that string could be removed with `jAwn.Off(elements, "click.myPlugin")` or `jAwn.Off(elements, "click.simple")` without disturbing other click handlers attached to the elements. Namespaces are similar to CSS classes in that they are not hierarchical; only one name needs to match. 

In the second form of `jAwn.On()`, the events argument is a plain object. The keys are strings in the same form as the events argument with space-separated event type names and optional namespaces. The value for each key is a function (or false value) that is used as the handler instead of the final argument to the method. In other respects, the two forms are identical in their behavior as described below.

### Direct and delegated events

The majority of browser events `bubble`, or `propagate`, from the deepest, innermost element (the event target) in the document where they occur all the way up to the body and the `document` element. In Internet Explorer 8 and lower, a few events such as `change` and `submit` do not natively bubble but jAwn patches these to bubble and create consistent cross-browser behavior.

If `selector` is omitted or is null, the event handler is referred to as _direct_ or _directly-bound_. The handler is called every time an event occurs on the selected elements, whether it occurs directly on the element or bubbles from a descendant (inner) element.

When a `selector` is provided, the event handler is referred to as _delegated_. The handler is not called when the event occurs directly on the bound element, but only for descendants (inner elements) that match the selector. jAwn bubbles the event from the event target up to the element where the handler is attached (i.e., innermost to outermost element) and runs the handler for any elements along that path matching the selector.

**Event handlers are bound only to the currently selected elements; they must exist at the time your code makes the call to `jAwn.On()`.** To ensure the elements are present and can be selected, place scripts after the elements in the HTML markup or perform event binding inside a document ready handler. Alternatively, use delegated events to attach event handlers.

**Delegated events** have the advantage that they can process events from _descendant elements_ that are added to the document at a later time. By picking an element that is guaranteed to be present at the time the delegated event handler is attached, you can use delegated events to avoid the need to frequently attach and remove event handlers. This element could be the container element of a view in a Model-View-Controller design, for example, or `document` if the event handler wants to monitor all bubbling events in the document. The `document` element is available in the `head` of the document before loading any other HTML, so it is safe to attach events there without waiting for the document to be ready.

In addition to their ability to handle events on descendant elements not yet created, another advantage of delegated events is their potential for much lower overhead when many elements must be monitored.

**Note:** Delegated events do not work for SVG.

### The event handler and its environment

The `handler` argument is a function (or the value `false`, see below), and is required unless you pass an object for the `events` argument. You can provide an anonymous handler function at the point of the `jAwn.On()` call or declare a named function and pass its name.

When the browser triggers an event or other JavaScript calls jAwn's .Trigger() method, jAwn passes the handler an Event object it can use to analyze and change the status of the event. This object is a normalized subset of data provided by the browser; the browser's unmodified native event object is available in event.originalEvent. For example, event.type contains the event name (e.g., "resize") and event.target indicates the deepest (innermost) element where the event occurred.

By default, most events bubble up from the original event target to the document element. At each element along the way, jAwn calls any matching event handlers that have been attached. A handler can prevent the event from bubbling further up the document tree (and thus prevent handlers on those elements from running) by calling event.stopPropagation(). Any other handlers attached on the current element will run however. To prevent that, call event.stopImmediatePropagation(). (Event handlers bound to an element are called in the same order that they were bound.)

Similarly, a handler can call event.preventDefault() to cancel any default action that the browser may have for this event; for example, the default action on a click event is to follow the link. Not all browser events have default actions, and not all default actions can be canceled. See the W3C Events Specification for details.

Returning false from an event handler will automatically call event.stopPropagation() and event.preventDefault(). A false value can also be passed for the handler as a shorthand for function(){ return false; }.

When jAwn calls a handler, the `this` keyword is a reference to the element where the event is being delivered; for directly bound events this is the element where the event was attached and for delegated events this is an element matching selector. (Note that this may not be equal to event.target if the event has bubbled from a descendant element.)

### Passing data to the handler

If a data argument is provided to jAwn.On() and is not `null` or `undefined`, it is passed to the handler in the event.data property each time an event is triggered. The data argument can be any type, but if a string is used the selector must either be provided or explicitly passed as null so that the data is not mistaken for a selector. Best practice is to use a plain object so that multiple values can be passed as properties.

The same event handler can be bound to an element multiple times. This is especially useful when the event.data feature is being used, or when other unique data resides in a closure around the event handler function.

As an alternative or in addition to the data argument provided to the `jAwn.On()` method, you can also pass data to an event handler using a second argument to `jAwn.Trigger()` or `jAwn.TriggerHandler()`. Data provided this way is passed to the event handler as further parameters after the Event object. If an array was passed to the second argument of `jAwn.Trigger()` or `jAwn.TriggerHandler()`, each element in the array will be presented to the event handler as an individual parameter.

### jAwn.Off( elements, events [, selector ] [, handler ] )
### jAwn.Off( elements, events [, selector ] )
### jAwn.Off( elements, event )

The `jAwn.Off()` method removes event handlers that were attached with `jAwn.On()`. Calling `jAwn.Off()` with no arguments removes all handlers attached to the elements. Specific event handlers can be removed on elements by providing combinations of event names, namespaces, selectors, or handler function names. When multiple filtering arguments are given, all of the arguments provided must match for the event handler to be removed.

If a simple event name such as "click" is provided, all events of that type (both direct and delegated) are removed from the elements. When writing code best practice is to attach and remove events using namespaces so that the code will not inadvertently remove event handlers attached by other code. All events of all types in a specific namespace can be removed from an element by providing just a namespace, such as `".myPlugin"`. At minimum, either a namespace or event name must be provided.

To remove specific delegated event handlers, provide a selector argument. The selector string must exactly match the one passed to `jAwn.On()` when the event handler was attached. To remove all delegated events from an element without removing non-delegated events, use the special value `"**"`.

A handler can also be removed by specifying the function name in the handler argument. When jAwn attaches an event handler, it assigns a unique id to the handler function.

As with `jAwn.On()`, you can pass events as an object instead of specifying an events string and handler function as separate arguments. The keys for the events object are events and/or namespaces; the values are handler functions or the special value `false`.

### jAwn.One( elements, events [, data ], handler )
### jAwn.One( elements, events [, selector ] [, data ], handler )
### jAwn.One( elements, events [, selector ] [, data ] )

The jAwn.One() method is identical to jAwn.On(), except that the handler for a given element and event type is unbound after its first invocation.
