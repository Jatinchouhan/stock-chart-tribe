let chartInstance = null;

// Set default dates on page load
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  document.getElementById('endDate').value = today.toISOString().split('T')[0];
  document.getElementById('startDate').value = oneMonthAgo.toISOString().split('T')[0];
});

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'loading';

  statusDiv.innerHTML = `
    <div class="${className}">
      ${type === 'loading' ? '<div class="loading-spinner"></div>' : ''}
      ${message}
    </div>
  `;
}

function clearStatus() {
  document.getElementById('status').innerHTML = '';
}

// Yahoo Finance API fetch
async function fetchFromYahooFinance(symbol) {
  try {
    console.log(`🔄 Fetching ${symbol} data from Yahoo Finance...`);
    showStatus(`Fetching ${symbol} data from Yahoo Finance...`, 'loading');

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=3mo`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]?.timestamp) {
      throw new Error('No data available for this symbol');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0];

    const stockData = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      price: prices.close[index],
      open: prices.open[index],
      high: prices.high[index],
      low: prices.low[index],
      volume: prices.volume[index]
    })).filter(item => item.price !== null);

    console.log(`✅ Successfully fetched ${stockData.length} data points from Yahoo Finance`);
    return stockData;

  } catch (error) {
    console.error(`❌ Yahoo Finance failed:`, error.message);
    throw error;
  }
}

async function fetchChart() {
  const symbol = document.getElementById('symbol').value.toUpperCase();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!symbol || !startDate || !endDate) {
    showStatus("Please select a stock symbol and date range.", 'error');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    showStatus("Start date must be before end date.", 'error');
    return;
  }

  const button = document.querySelector('.fetch-btn');
  button.disabled = true;
  button.textContent = '⏳ Loading...';

  try {
    const stockData = await fetchFromYahooFinance(symbol);

    const filteredData = stockData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
    });

    if (filteredData.length === 0) {
      showStatus("No data available for the selected date range.", 'error');
      return;
    }

    createChart(filteredData, symbol);
    showStatus(`✅ Successfully loaded ${filteredData.length} data points from Yahoo Finance`, 'success');

    setTimeout(clearStatus, 3000);

  } catch (error) {
    showStatus(`❌ Failed to fetch data: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '📊 Fetch Chart';
  }
}

function createChart(data, symbol) {
  const canvas = document.getElementById('stockChart');
  const ctx = canvas.getContext('2d');

  // Fixed canvas size for consistent chart sizing
  canvas.width = 600;
  canvas.height = 300;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = data.map(item => item.date);
  const prices = data.map(item => item.price);

  // Color based on price change
  const currentPrice = prices[prices.length - 1];
  const previousPrice = prices[prices.length - 2] || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const chartColor = priceChange >= 0 ? '#10b981' : '#ef4444';

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${symbol} Closing Price (₹)`,
        data: prices,
        borderColor: chartColor,
        backgroundColor: chartColor + '20',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: chartColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2, // 600x300 ratio
      plugins: {
        title: {
          display: true,
          text: `${symbol} Stock Price Chart`,
          font: {
            size: 20,
            weight: 'bold'
          },
          padding: 20,
          color: '#ffffff'
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            color: '#ffffff'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: chartColor,
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(context) {
              return new Date(context[0].label).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            },
            label: function(context) {
              const dataPoint = data[context.dataIndex];
              return [
                `Close: ₹${dataPoint.price.toFixed(2)}`,
                `Open: ₹${dataPoint.open.toFixed(2)}`,
                `High: ₹${dataPoint.high.toFixed(2)}`,
                `Low: ₹${dataPoint.low.toFixed(2)}`,
                `Volume: ${dataPoint.volume.toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date',
            font: {
              size: 14,
              weight: 'bold'
            },
            color: '#ffffff'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: 8,
            autoSkip: true
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Price (₹)',
            font: {
              size: 14,
              weight: 'bold'
            },
            color: '#ffffff'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            callback: function(value) {
              return '₹' + value.toFixed(0);
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      }
    }
  });

  console.log(`📈 Chart created for ${symbol} with ${data.length} data points`);
}

// Keyboard shortcut: Ctrl+Enter or Cmd+Enter to fetch chart
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    fetchChart();
  }
});
