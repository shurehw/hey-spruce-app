require('dotenv').config();
const axios = require('axios');

class SpruceClient {
  constructor() {
    this.apiKey = process.env.SPRUCE_API_KEY;
    this.owKey = process.env.SPRUCE_KEY;
    this.baseURL = process.env.SPRUCE_API_URL || 'https://api.heyspruce.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'ow-key': this.owKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Get all products
  async getProducts() {
    try {
      const response = await this.client.get('/products');
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get single product by ID
  async getProduct(productId) {
    try {
      const response = await this.client.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error.response?.data || error.message);
      throw error;
    }
  }

  // Search products
  async searchProducts(query) {
    try {
      const response = await this.client.get('/products/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching products:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get inventory
  async getInventory() {
    try {
      const response = await this.client.get('/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create order
  async createOrder(orderData) {
    try {
      const response = await this.client.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get order status
  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get all orders
  async getOrders() {
    try {
      const response = await this.client.get('/orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error.response?.data || error.message);
      throw error;
    }
  }

  // Generic GET request
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error(`Error GET ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Generic POST request
  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`Error POST ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Generic PUT request
  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`Error PUT ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Generic DELETE request
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error DELETE ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = SpruceClient;