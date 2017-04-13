// Cache
(function (cache, window, document, undefined) {

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
    function data () {

        this.cacheKey = 'jAwnCache3.0' + data.guid++;

    };
    data.guid = 1;
    data.accepts = acceptData;
    data.prototype = {
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
            if (!data.accepts(owner)) {
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
    var dataCache = new data();

    // Public Methods
    cache.get = function (element, key) {

        return dataCache.get(element, key);

    };

    cache.set = function (element, key, value) {

        return dataCache.set(element, key, value);

    };

    cache.access = function (element, key, value) {

        return dataCache.access(element, key, value);

    };

    cache.hasData = function (element) {

        return dataCache.hasData(element);

    };

    cache.remove = function (element, key) {

        return dataCache.remove(element, key);

    };

    // TODO: Test performance
    // Called from jAwn.RemoveElement to cleanup data and events on elements prior to removal from DOM
    cache.cleanElementData = function (elements) {

        // Convert elements to an array, if necessary.
        if (!elements.length) {
            elements = [elements];
        }
        var data, element, type, index = 0;
        var eventInternal = jAwn.getInternal();
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

    // Determines if object is empty
    function isEmptyObject (object) {

        var property;
        for (property in object) {
            return false;
        }
        return true;

    };

} (window.cache = window.cache || {}, window, document));
