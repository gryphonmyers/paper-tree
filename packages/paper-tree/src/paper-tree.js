// Simple implementation of lodash.get 
// From: https://gist.github.com/andrewchilds/30a7fb18981d413260c7a36428ed13da
// Handles arrays, objects, and any nested combination of the two.
// Also handles undefined as a valid value - see test case for details.
// Based on: https://gist.github.com/harish2704/d0ee530e6ee75bad6fd30c98e5ad9dab
/**
 * 
 * @param {Record<string, any>} obj 
 * @param {string|string[]} query 
 * @param {any} defaultVal 
 * @returns {any}
 */
export function deepGet(obj, query, defaultVal) {
    query = Array.isArray(query) ? query : query.replace(/(\[(\d)\])/g, '.$2').replace(/^\./, '').split('.');
    if (!(query[0] in obj)) {
        return defaultVal;
    }
    obj = obj[query[0]];
    if (obj && query.length > 1) {
        return deepGet(obj, query.slice(1), defaultVal);
    }
    return obj;
}