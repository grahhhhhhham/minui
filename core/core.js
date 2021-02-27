/**
 * @file
 * Provides abstracted user interface features, available on `_ui` object
 */

import {eventStack} from './events.js';
import {toArray, addEv, bubblingFactory} from './helpers.js';

export let minui;

(function() {
  /**
   * Prototype that minUI is constructed from
   * @constructor
   */
  const UserInterface = (function() {
    let settings = {};
    let loadStates = {};

    /**
     * Returns the desired properties from an HTMLElement as a key-value pair object
     * @param {HTMLElement} element - a HTMLElement object to select properties from
     * @param {string[]} props - array containing property names to select
     * @returns {Object} object containing key-value pairs of retrieved props (includes undefined)
     */
    const getProps = function getProps(element, props) {
      let selectedProps = {};

      props.forEach((prop) => {
        selectedProps[prop] = element[prop];
      });

      return selectedProps;
    };

    /**
     * Returns an array of properties for given elements
     * @param {HTMLElement[]} elements - array of HTMLElement objects to select properties from 
     * @param {string[]} props - array containing property names to select
     * @returns {Array} containing retrieved props for each element (includes undefined)
     */
    const getAllProps = function getAllProps(elements, props) {
      return elements.map((element) => {
        getProps(element, props);
      });
    };

    /**
     * Returns an array of HTMLElements based on class, id, or CSS selector query
     * @param {Object} options - a key-value pair object for determining which document method to use
     * @returns {HTMLElement[]} containing individual HTMLElement objects 
     */
    const getElements = function getElements(options) {
      if (options.id) {
        return [document.getElementById(options.id)];
      }

      else if (options.class) {
        return toArray(document.getElementsByClassName(options.class));
      }

      else if (options.query) {
        return toArray(document.querySelectorAll(options.query));
      }
    };

    /**
     *  Determines which retrieval method to use
     * @param {Object} options - a key-value pair object for determining which internal retrieval method to use
     * @returns {*} data structure determined by internal methods and intent evaluated from options 
     */
    const getFromInterface = function getFromInterface(options) {
      let elements = getElements(options);
      
      if (options.id && options.props) {
        return getProps(elements[0], options.props);
      }

      else if (options.id) {
        return elements[0];
      }

      else if (options.props) {
        return getAllProps(elements, options.props);
      }

      else {
        return elements;
      }
    };

    /**
     * General event listening applicator
     * @param {Function} fn - function to be applied to event listener
     * @param {Object} options - a key-value pair object for determining how to apply listeners
     * @returns {Boolean} represents general success of event application
     */
    const applyEventListener = function applyEventListener(fn, options) {
      if (typeof fn !== 'function') {
        return false;
      }

      let eventType = options.ev ? options.ev : options.type,
          holder = 'document';

      if (options.document || options.bubble) {
        let eventFn = options.bubble ? bubblingFactory(fn, options.class) : fn;
        addEv(document, options.ev, eventFn, eventStack, holder);
      }
      
      else {
        let elements = getElements(options);
        holder = options.class ? options.class : options.query;

        elements.forEach(element => {
          addEv(element, eventType, fn, eventStack, holder);
        });
      }

      let eventAdded = {
        type: "fn",
        val: fn,
        existsOn: holder,
      };

      return eventStack.exists(eventAdded);
    };

    /**
     * Creates dynamic event methods on prototype
     * @param {*} thisArg - represents `this`, aka the prototype
     * @param {string} eventName - the event being defined on the prototype
     */
    const attachEvents = function attachEvents(thisArg, eventName) {
      const eventFactory = function eventFactory() {
        /**
         * Blueprint used with event factory @see defEvent
         * @param {(Function|Object)} fn - function to apply to event or
         * @param {(Function|Object)} options - options object containing event info
         */
        return function eventBlueprint(...args) {
          let fn, options;

          if (typeof args[0] === 'function') {
            fn = args[0];
            options = args[1];
          } else {
            fn = args[1];
            options = args[0];
          }

          if (options.bubble !== false) options.bubble = true;

          options.type = eventName;
          return applyEventListener.call(thisArg, fn, options);
        }
      };

      Object.getPrototypeOf(thisArg)[eventName] = eventFactory();
    };

    return {
      /**
       * Setup method typically used once for defining event methods and other settings
       * @param {*} newSettings - key-pair object of setting values
       * @param {Function} fn - function to execute during setup
       */
      setup(newSettings, fn) {
        settings = newSettings;
        fn();
      },

      /**
       * Applies given function to `DOMContentLoaded` event
       * @param {Function} fn - function to be applied once the DOM is loaded
       */
      loaded(fn) {
        applyEventListener(fn, {ev: 'DOMContentLoaded', document: true});
      },

      /**
       * Retrieve information from the DOM
       * @param {*} options - key-pair object
       * @param {string} options.id - id of HTMLElement
       * @param {string} options.class - class of HTMLElement(s)
       * @param {string} options.query - CSS selector query
       * @param {string[]} options.props - desired props to retrieve from HTMLElement(s)
       */
      get(options) {
        return getFromInterface(options);
      },

      /**
       * Retrieve all events from current event stack
       */
      events() {
        return eventStack.all();
      },

      /**
       * Filter for specific events from event stack
       * @param {*} query - key-value object
       * @param {string} query.query - CSS selector query (WIP)
       * @param {string} query.type - type of event to look for (e.g. 'click')
       * @param {string} query.fn - name of function to find in event stack
       */
      findEvents(query) {
        return eventStack.find(query);
      },

      /**
       * Defines a new event on the prototype, allowing you to invoke `_ui.{eventName()}`
       * @param {string} eventName - type of event to be defined
       */
      defEvent(eventName) {
        attachEvents(this, eventName);
      },

      /**
       * Defines multiple new events on the prototype, allowing you to invoke `_ui.{eventName()}`
       * @param {string[]} events - types of events to be defined
       */
      defEvents(events) {
        events.forEach(event => this.defEvent(event), this);
      },

      /**
       * Update styling for a HTMLElement
       * @param {HTMLElement} element - a HTMLElement to update styles for
       * @param {*} styles - key-value pair representing style values
       */
      changeStyle(element, styles) {
        for (var newStyle in styles) {
          element.style[newStyle] = styles[newStyle];
        }
      },

      /**
       * Toggles classes on a desired element
       * @param {HTMLElement} element - desired element to update
       * @param {string[]} classList - array of classes to toggle on `element`
       */
      toggleClasses(element, classList) {
        classList.forEach(klass => element.classList.toggle(klass));
      },

      /**
       * Defines a loading state for an element (WIP)
       * @param {*} options 
       */
      defLoadState(options) {
        loadStates[options.element] = {
          default: options.default,
          loading: options.loading,
          success: options.success,
          error: options.error,
        };
      },

      /**
       * Initiates load state for elements (WIP)
       * @param {*} elements 
       */
      startLoad(elements) {
        let elementList = this.get({query: elements});

        elementList.forEach((element) => {
          element.className = '';
          element.classList.add(...loadStates[elements].loading);
        });
      },

      /**
       * Stops the load state for an element with a specific success type (WIP)
       * @param {*} elements 
       * @param {*} successType 
       */
      stopLoad(elements, successType) {
        let elementList = this.get({query: elements});

        elementList.forEach((element) => {
          element.classList.remove(...loadStates[elements].loading);
          element.classList.add(...loadStates[elements][successType]);
        });
      },

      init() {
        return this;
      }
    }
  })();

  minui = Object.create(UserInterface).init();
})();