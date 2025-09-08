// Simple Chart Components (using Canvas API)
import { UIConfig } from './config.js';

export class ChartManager {
  constructor(canvas, options = {}) {
    this.canvas = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    this.ctx = this.canvas.getContext('2d');
    this.options = {
      responsive: true,
      colors: [
        UIConfig.colors.primary,
        UIConfig.colors.secondary,
        UIConfig.colors.client,
        UIConfig.colors.admin,
        UIConfig.colors.sub,
        UIConfig.colors.warning,
        UIConfig.colors.danger
      ],
      padding: 40,
      ...options
    };
    this.data = null;
    
    this.setupCanvas();
  }

  setupCanvas() {
    if (this.options.responsive) {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    if (this.data) {
      this.render();
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Bar Chart
  drawBarChart(data, options = {}) {
    this.data = { type: 'bar', data, options };
    this.clear();
    
    const { labels, datasets } = data;
    const chartArea = this.getChartArea();
    const maxValue = Math.max(...datasets.flatMap(d => d.data));
    
    // Draw axes
    this.drawAxes(chartArea);
    
    // Draw bars
    const barWidth = chartArea.width / labels.length * 0.8;
    const barSpacing = chartArea.width / labels.length * 0.2;
    
    datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartArea.height;
        const x = chartArea.x + (index * (barWidth + barSpacing)) + (barSpacing / 2);
        const y = chartArea.y + chartArea.height - barHeight;
        
        this.ctx.fillStyle = this.options.colors[datasetIndex % this.options.colors.length];
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value label
        this.ctx.fillStyle = UIConfig.colors.text;
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(value, x + barWidth / 2, y - 5);
      });
    });
    
    // Draw labels
    this.ctx.fillStyle = UIConfig.colors.text;
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = chartArea.x + (index * (barWidth + barSpacing)) + (barSpacing / 2) + barWidth / 2;
      const y = chartArea.y + chartArea.height + 20;
      this.ctx.fillText(label, x, y);
    });
  }

  // Line Chart
  drawLineChart(data, options = {}) {
    this.data = { type: 'line', data, options };
    this.clear();
    
    const { labels, datasets } = data;
    const chartArea = this.getChartArea();
    const maxValue = Math.max(...datasets.flatMap(d => d.data));
    const minValue = Math.min(...datasets.flatMap(d => d.data));
    const valueRange = maxValue - minValue;
    
    // Draw axes
    this.drawAxes(chartArea);
    
    datasets.forEach((dataset, datasetIndex) => {
      const color = this.options.colors[datasetIndex % this.options.colors.length];
      
      // Draw line
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = chartArea.x + (index / (labels.length - 1)) * chartArea.width;
        const y = chartArea.y + chartArea.height - ((value - minValue) / valueRange) * chartArea.height;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.stroke();
      
      // Draw points
      this.ctx.fillStyle = color;
      dataset.data.forEach((value, index) => {
        const x = chartArea.x + (index / (labels.length - 1)) * chartArea.width;
        const y = chartArea.y + chartArea.height - ((value - minValue) / valueRange) * chartArea.height;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      });
    });
    
    // Draw labels
    this.ctx.fillStyle = UIConfig.colors.text;
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = chartArea.x + (index / (labels.length - 1)) * chartArea.width;
      const y = chartArea.y + chartArea.height + 20;
      this.ctx.fillText(label, x, y);
    });
  }

  // Pie Chart
  drawPieChart(data, options = {}) {
    this.data = { type: 'pie', data, options };
    this.clear();
    
    const { labels, datasets } = data;
    const values = datasets[0].data;
    const total = values.reduce((sum, val) => sum + val, 0);
    
    const centerX = this.canvas.width / (2 * window.devicePixelRatio);
    const centerY = this.canvas.height / (2 * window.devicePixelRatio);
    const radius = Math.min(centerX, centerY) - this.options.padding;
    
    let currentAngle = -Math.PI / 2; // Start at top
    
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const color = this.options.colors[index % this.options.colors.length];
      
      // Draw slice
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Draw percentage label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      const percentage = Math.round((value / total) * 100);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${percentage}%`, labelX, labelY);
      
      currentAngle += sliceAngle;
    });
    
    // Draw legend
    this.drawLegend(labels, this.options.colors);
  }

  drawAxes(chartArea) {
    this.ctx.strokeStyle = UIConfig.colors.muted;
    this.ctx.lineWidth = 1;
    
    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(chartArea.x, chartArea.y + chartArea.height);
    this.ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
    this.ctx.stroke();
    
    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(chartArea.x, chartArea.y);
    this.ctx.lineTo(chartArea.x, chartArea.y + chartArea.height);
    this.ctx.stroke();
  }

  drawLegend(labels, colors) {
    const legendX = 20;
    let legendY = 20;
    
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'left';
    
    labels.forEach((label, index) => {
      // Color box
      this.ctx.fillStyle = colors[index % colors.length];
      this.ctx.fillRect(legendX, legendY, 12, 12);
      
      // Label text
      this.ctx.fillStyle = UIConfig.colors.text;
      this.ctx.fillText(label, legendX + 20, legendY + 9);
      
      legendY += 20;
    });
  }

  getChartArea() {
    const padding = this.options.padding;
    return {
      x: padding,
      y: padding,
      width: (this.canvas.width / window.devicePixelRatio) - (padding * 2),
      height: (this.canvas.height / window.devicePixelRatio) - (padding * 2)
    };
  }

  render() {
    if (!this.data) return;
    
    switch (this.data.type) {
      case 'bar':
        this.drawBarChart(this.data.data, this.data.options);
        break;
      case 'line':
        this.drawLineChart(this.data.data, this.data.options);
        break;
      case 'pie':
        this.drawPieChart(this.data.data, this.data.options);
        break;
    }
  }
}

// Spruce App specific chart generators
export class SpruceCharts {
  static workOrdersByStatus(data) {
    return {
      labels: ['Pending', 'Assigned', 'In Progress', 'Completed'],
      datasets: [{
        data: [
          data.filter(wo => wo.status === 'pending').length,
          data.filter(wo => wo.status === 'assigned').length,
          data.filter(wo => wo.status === 'in-progress').length,
          data.filter(wo => wo.status === 'completed').length
        ]
      }]
    };
  }

  static monthlyRevenue(data) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
    }
    
    return {
      labels: last6Months,
      datasets: [{
        data: last6Months.map(month => {
          const monthData = data.filter(item => {
            const itemMonth = new Date(item.date).toLocaleString('en', { month: 'short' });
            return itemMonth === month;
          });
          return monthData.reduce((sum, item) => sum + item.amount, 0);
        })
      }]
    };
  }

  static technicianPerformance(data) {
    return {
      labels: data.map(tech => tech.name),
      datasets: [{
        data: data.map(tech => tech.rating)
      }]
    };
  }

  static priorityDistribution(data) {
    return {
      labels: ['Low', 'Standard', 'Urgent', 'Emergency'],
      datasets: [{
        data: [
          data.filter(item => item.priority === 'low').length,
          data.filter(item => item.priority === 'standard').length,
          data.filter(item => item.priority === 'urgent').length,
          data.filter(item => item.priority === 'emergency').length
        ]
      }]
    };
  }
}