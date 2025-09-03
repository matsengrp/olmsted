/**
 * IndexedDB wrapper for Olmsted client-side data storage
 * Provides simple async API for storing large AIRR datasets
 */

class IndexedDBHelper {
  constructor() {
    this.dbName = 'OlmstedClientStorage';
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB: Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB: Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('IndexedDB: Setting up database schema');

        // Create object stores (tables)
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'dataset_id' });
        }

        if (!db.objectStoreNames.contains('clones')) {
          db.createObjectStore('clones', { keyPath: 'dataset_id' });
        }

        if (!db.objectStoreNames.contains('trees')) {
          db.createObjectStore('trees', { keyPath: 'ident' });
        }

        console.log('IndexedDB: Schema setup complete');
      };
    });
  }

  /**
   * Ensure database is initialized
   * @returns {Promise<void>}
   */
  async ensureInit() {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Store data in IndexedDB
   * @param {string} storeName - Object store name
   * @param {any} data - Data to store
   * @returns {Promise<void>}
   */
  async setItem(storeName, data) {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => {
        console.error(`IndexedDB: Failed to store data in ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Retrieve data from IndexedDB
   * @param {string} storeName - Object store name
   * @param {string} key - Key to retrieve
   * @returns {Promise<any|null>}
   */
  async getItem(storeName, key) {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        console.error(`IndexedDB: Failed to get data from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Get all items from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<Array>}
   */
  async getAllItems(storeName) {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error(`IndexedDB: Failed to get all data from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Remove data from IndexedDB
   * @param {string} storeName - Object store name
   * @param {string} key - Key to remove
   * @returns {Promise<void>}
   */
  async removeItem(storeName, key) {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        console.error(`IndexedDB: Failed to remove data from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all data from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        console.error(`IndexedDB: Failed to clear ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all data from all stores
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.ensureInit();
    
    const storeNames = ['datasets', 'clones', 'trees'];
    await Promise.all(storeNames.map(storeName => this.clearStore(storeName)));
    console.log('IndexedDB: Cleared all data');
  }

  /**
   * Get storage usage estimate
   * @returns {Promise<object>}
   */
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        usedMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
        totalMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
        availableMB: (((estimate.quota || 0) - (estimate.usage || 0)) / (1024 * 1024)).toFixed(2)
      };
    }
    return { message: 'Storage estimation not supported' };
  }
}

// Create a singleton instance
const indexedDBHelper = new IndexedDBHelper();

export default indexedDBHelper;