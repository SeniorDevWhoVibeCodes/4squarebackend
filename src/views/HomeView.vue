<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface Market {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_ask: number;
  no_ask: number;
  close_time: string;
  open_time: string;
  event_ticker: string;
  rules_primary?: string;
}

interface EventGroup {
  eventTicker: string;
  title: string;
  subtitle: string;
  marketCount: number;
  markets: Market[];
  stats?: {
      n: number;
      cost: number;
      profit: number;
      details: string;
  };
}

const allGroups = ref<EventGroup[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isWaitingForRefresh = ref(false);

const searchQuery = ref('');
const minProfit = ref(1);
const maxDays = ref(30);
const minDaysOpen = ref(0);
const strikeCounts = ref<number[]>([1, 2, 3, 4]);
const endingTomorrow = ref(false);
const topXOptions = ref<number[]>([2]); // Default to Top 2

const hiddenList = ref<string[]>(JSON.parse(localStorage.getItem('hiddenEvents') || '[]'));
const watchList = ref<string[]>(JSON.parse(localStorage.getItem('watchedEvents') || '[]'));

const getMarketUrl = (eventTicker: string) => {
  if (!eventTicker) return '#';
  const parts = eventTicker.split('-');
  const seriesTicker = parts[0];
  if (!seriesTicker) return '#';
  return `https://kalshi.com/markets/${seriesTicker.toLowerCase()}`;
};

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    console.log('API Data received:', data);
    
    if (!data || data.length === 0) {
      isWaitingForRefresh.value = true;
      setTimeout(fetchData, 15000);
    } else {
      allGroups.value = data;
      isWaitingForRefresh.value = false;
    }
  } catch (e: any) {
    error.value = e.message;
    setTimeout(fetchData, 15000);
  } finally {
    loading.value = false;
  }
};

const toggleHide = (ticker: string) => {
  if (hiddenList.value.includes(ticker)) {
    hiddenList.value = hiddenList.value.filter(t => t !== ticker);
  } else {
    hiddenList.value.push(ticker);
  }
  localStorage.setItem('hiddenEvents', JSON.stringify(hiddenList.value));
};

const toggleWatch = (ticker: string) => {
  if (watchList.value.includes(ticker)) {
    watchList.value = watchList.value.filter(t => t !== ticker);
  } else {
    watchList.value.push(ticker);
  }
  localStorage.setItem('watchedEvents', JSON.stringify(watchList.value));
};

const unhideAll = () => {
    hiddenList.value = [];
    localStorage.setItem('hiddenEvents', '[]');
};

const toggleTopX = (n: number) => {
    if (topXOptions.value.includes(n)) {
        // Don't allow empty selection, keep at least one
        if (topXOptions.value.length > 1) {
            topXOptions.value = topXOptions.value.filter(x => x !== n);
        }
    } else {
        topXOptions.value.push(n);
    }
};

const calculateGroupStats = (group: EventGroup) => {
    const sorted = [...group.markets].sort((a, b) => (b.yes_ask || 0) - (a.yes_ask || 0));
    
    // Calculate stats for all selected Top X options
    const possibleStats = topXOptions.value.map(n => {
        const selected = sorted.slice(0, n);
        const cost = selected.reduce((sum, m) => sum + (m.yes_ask || 0), 0);
        const profit = 100 - cost;
        const details = selected.map(m => `${m.title} (${m.yes_ask}¢)`).join(' + ');
        return { n, cost, profit, details };
    });

    if (possibleStats.length === 0) {
        return { n: 0, cost: 0, profit: 0, details: 'None' };
    }

    // Return the best one (highest profit)
    // If profits are equal, prefer lower N (less contracts to buy)
    return possibleStats.reduce((best, current) => {
        if (!best) return current;
        if (current.profit > best.profit) return current;
        if (current.profit === best.profit && current.n < best.n) return current;
        return best;
    });
};

const filteredGroups = computed(() => {
  const now = Date.now() / 1000;
  const tomorrowSeconds = 24 * 60 * 60;
  const maxSeconds = maxDays.value * 24 * 60 * 60;
  const minOpenSeconds = minDaysOpen.value * 24 * 60 * 60;

  return allGroups.value.map(g => ({
      ...g,
      stats: calculateGroupStats(g)
  })).filter(g => {
    if (!g.stats) return false;

    const searchLower = searchQuery.value.toLowerCase();
    const matchesSearch = g.title.toLowerCase().includes(searchLower) || 
                          g.eventTicker.toLowerCase().includes(searchLower) ||
                          g.markets.some(m => m.rules_primary?.toLowerCase().includes(searchLower));
    
    const matchesProfit = g.stats.profit >= minProfit.value;
    const matchesStrikes = strikeCounts.value.includes(g.marketCount);
    const isHidden = hiddenList.value.includes(g.eventTicker);
    
    // Date Logic with Safety Checks
    let matchesDateEnd = true;
    let matchesDateStart = true;

    if (g.markets.length > 0) {
        // Safe parsing helper
        const getTs = (dateStr: string | undefined) => dateStr ? new Date(dateStr).getTime() / 1000 : NaN;
        
        const closeTimes = g.markets.map(m => getTs(m.close_time)).filter(t => !isNaN(t));
        const openTimes = g.markets.map(m => getTs(m.open_time)).filter(t => !isNaN(t));

        if (closeTimes.length > 0) {
            const earliestClose = Math.min(...closeTimes);
            const timeToClose = earliestClose - now;
            matchesDateEnd = endingTomorrow.value ? (timeToClose <= tomorrowSeconds) : (timeToClose <= maxSeconds);
        }

        if (openTimes.length > 0) {
            const latestOpen = Math.max(...openTimes);
            const timeSinceOpen = now - latestOpen;
            matchesDateStart = timeSinceOpen >= minOpenSeconds;
        }
    }

    return matchesSearch && matchesProfit && matchesStrikes && matchesDateEnd && matchesDateStart && !isHidden;
  }).sort((a, b) => {
    const aWatched = watchList.value.includes(a.eventTicker);
    const bWatched = watchList.value.includes(b.eventTicker);
    if (aWatched && !bWatched) return -1;
    if (!aWatched && bWatched) return 1;
    
    const profitA = a.stats?.profit ?? -999;
    const profitB = b.stats?.profit ?? -999;
    return profitB - profitA;
  });
});

onMounted(fetchData);
</script>

<template>
  <main class="space-y-6">
    <!-- Controls Section -->
    <div class="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <div class="flex flex-col gap-6">
        
        <!-- Top Row: Search & Dates -->
        <div class="flex flex-col md:flex-row gap-6">
           <!-- Search -->
           <div class="flex-grow">
              <label for="search" class="block mb-2 text-sm font-medium text-white">Search (Title, Ticker, Rules)</label>
              <input v-model="searchQuery" type="text" id="search" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Search keywords..." />
           </div>

           <!-- Dates -->
           <div class="flex gap-4 flex-shrink-0">
               <div class="flex flex-col w-32">
                    <label class="block mb-2 text-sm font-medium text-white">Max Days Left</label>
                    <input v-model.number="maxDays" type="number" :disabled="endingTomorrow" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 disabled:opacity-50" />
               </div>
               <div class="flex flex-col w-32">
                    <label class="block mb-2 text-sm font-medium text-white">Min Days Open</label>
                    <input v-model.number="minDaysOpen" type="number" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5" />
               </div>
           </div>
        </div>
        
        <!-- Middle Row: Profit, Top X, Strikes -->
        <div class="flex flex-col lg:flex-row gap-6 items-end">
            <!-- Min Profit -->
            <div class="flex-grow w-full lg:w-auto">
                <label class="block mb-2 text-sm font-medium text-white flex justify-between">
                    <span>Min Profit</span>
                    <span :class="minProfit > 0 ? 'text-green-400' : 'text-gray-400'">{{ minProfit }}¢</span>
                </label>
                <input v-model.number="minProfit" type="range" min="1" max="100" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer">
            </div>

            <!-- Top X Selector -->
            <div class="flex flex-col flex-shrink-0">
                <label class="block mb-2 text-sm font-medium text-white">Top X Options</label>
                <div class="flex gap-1 bg-gray-700 p-1 rounded-lg">
                    <button v-for="n in [1, 2, 3, 4]" :key="n" @click="toggleTopX(n)" 
                            :class="['px-4 py-1.5 rounded-md text-sm font-bold transition-all', topXOptions.includes(n) ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white']">
                        {{ n }}
                    </button>
                </div>
            </div>

             <!-- Strikes -->
            <div class="flex flex-col flex-shrink-0">
               <label class="block mb-2 text-sm font-medium text-white">Strikes</label>
               <div class="flex gap-2 bg-gray-700 p-1.5 rounded-lg items-center h-[42px]">
                 <div v-for="n in [1, 2, 3, 4]" :key="n" class="flex items-center px-2">
                    <input :id="'checkbox-'+n" type="checkbox" :value="n" v-model="strikeCounts" class="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2">
                    <label :for="'checkbox-'+n" class="ms-2 text-sm font-medium text-gray-300 cursor-pointer">{{ n }}</label>
                 </div>
               </div>
            </div>
        </div>

        <!-- Bottom Row: Toggles & Actions -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-700">
            <!-- Quick Filters -->
            <div class="flex items-center">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="endingTomorrow" class="sr-only peer">
                    <div class="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span class="ms-3 text-sm font-medium text-gray-300">Ending Tomorrow</span>
                </label>
            </div>

            <!-- Stats & Refresh -->
            <div class="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <span class="text-sm text-gray-400 whitespace-nowrap">Found {{ filteredGroups.length }} events</span>
                <button @click="fetchData" type="button" class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-800 font-medium rounded-lg text-sm px-6 py-2.5 transition-colors">
                    Refresh Data
                </button>
            </div>
        </div>

      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="loading" class="text-center p-8">
        <div role="status">
            <svg aria-hidden="true" class="inline w-8 h-8 text-gray-600 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.9766 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
        </div>
        <p class="mt-4 text-gray-400">Loading markets...</p>
    </div>
    <div v-else-if="isWaitingForRefresh" class="p-4 mb-4 text-sm text-yellow-300 rounded-lg bg-gray-800 border border-yellow-800" role="alert">
      <span class="font-medium">Waiting for data!</span> No data available yet. System is refreshing (retrying every 15s)...
    </div>
    <div v-else-if="error" class="p-4 mb-4 text-sm text-red-400 rounded-lg bg-gray-800 border border-red-800" role="alert">
      {{ error }}. Retrying in 15s...
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="group in filteredGroups" :key="group.eventTicker" 
           class="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm flex flex-col transition-all hover:-translate-y-1 hover:border-green-400"
           :class="{ 'border-yellow-500 bg-gray-700 ring-1 ring-yellow-500': watchList.includes(group.eventTicker) }">
        
        <div class="flex justify-between items-start mb-4">
          <span :class="['text-xs font-bold px-2.5 py-0.5 rounded', (group.stats?.profit ?? 0) > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300']">
            {{ (group.stats?.profit ?? 0) > 0 ? '+' : '' }}{{ group.stats?.profit ?? 0 }}¢
          </span>
          <div class="flex gap-2">
            <button @click="toggleWatch(group.eventTicker)" class="text-gray-400 hover:text-yellow-400" :title="watchList.includes(group.eventTicker) ? 'Unwatch' : 'Watch'">
               <span v-if="watchList.includes(group.eventTicker)" class="text-yellow-400 text-xl">★</span>
               <span v-else class="text-xl">☆</span>
            </button>
            <button @click="toggleHide(group.eventTicker)" class="text-gray-400 hover:text-red-500 text-xl" title="Hide">✕</button>
          </div>
        </div>

        <h5 class="mb-2 text-xl font-bold tracking-tight text-white line-clamp-2" :title="group.title">{{ group.title }}</h5>
        <p class="mb-3 font-normal text-gray-400 text-sm line-clamp-2" :title="group.subtitle">{{ group.subtitle }}</p>

        <div class="mt-auto space-y-2 mb-4 text-sm text-gray-300">
            <div class="flex justify-between border-b border-gray-700 pb-1">
                <span>Top {{ group.stats?.n ?? '?' }}:</span>
                <span class="font-medium text-right w-2/3 truncate" :title="group.stats?.details">{{ group.stats?.details }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1">
                <span>Total Cost:</span>
                <span class="font-bold text-white">{{ group.stats?.cost ?? 0 }}¢</span>
            </div>
            <div class="flex justify-between">
                <span>Strikes:</span>
                <span>{{ group.marketCount }}</span>
            </div>
        </div>
        
        <a :href="getMarketUrl(group.eventTicker)" target="_blank" class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-center text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-800">
            View on Kalshi
            <svg class="w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
            </svg>
        </a>
      </div>
    </div>

    <!-- Hidden Manager -->
    <div v-if="hiddenList.length > 0" class="flex justify-center mt-8">
        <button @click="unhideAll" type="button" class="text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700 font-medium rounded-lg text-sm px-5 py-2.5">
            Unhide All ({{ hiddenList.length }})
        </button>
    </div>
  </main>
</template>