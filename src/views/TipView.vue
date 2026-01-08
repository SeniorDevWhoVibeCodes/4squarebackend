<script setup lang="ts">
import { useQRCode } from '@vueuse/integrations/useQRCode'

const btc = import.meta.env.VITE_BTC_WALLET;
const usdc = import.meta.env.VITE_USDC_WALLET;
const sol = import.meta.env.VITE_SOL_WALLET;
const ltc = import.meta.env.VITE_LTC_WALLET;

const btcQR = useQRCode(btc || '');
const usdcQR = useQRCode(usdc || '');
const solQR = useQRCode(sol || '');
const ltcQR = useQRCode(ltc || '');

const copyToClipboard = (text: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  alert('Address copied to clipboard!');
};
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 text-center">
    <h1 class="text-3xl font-bold text-green-400 mb-4">Support 4-Square</h1>
    <p class="text-gray-300 mb-10 text-lg">If you find this tool useful, consider sending a tip to support development!</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <!-- Bitcoin -->
      <div v-if="btc" class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-400 transition-colors flex flex-col items-center">
        <h3 class="text-xl font-bold text-orange-400 mb-4">Bitcoin (BTC)</h3>
        <div class="bg-white p-2 rounded-lg mb-4">
            <img :src="btcQR" alt="BTC QR Code" class="w-40 h-40" />
        </div>
        <code @click="copyToClipboard(btc)" class="block w-full bg-gray-900 p-3 rounded text-sm font-mono text-gray-300 break-all cursor-pointer hover:bg-gray-700 transition-colors" title="Click to copy">
          {{ btc }}
        </code>
      </div>

      <!-- USDC -->
      <div v-if="usdc" class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-400 transition-colors flex flex-col items-center">
        <h3 class="text-xl font-bold text-blue-400 mb-4">USDC (ERC-20/Base)</h3>
        <div class="bg-white p-2 rounded-lg mb-4">
            <img :src="usdcQR" alt="USDC QR Code" class="w-40 h-40" />
        </div>
        <code @click="copyToClipboard(usdc)" class="block w-full bg-gray-900 p-3 rounded text-sm font-mono text-gray-300 break-all cursor-pointer hover:bg-gray-700 transition-colors" title="Click to copy">
          {{ usdc }}
        </code>
      </div>

      <!-- Solana -->
      <div v-if="sol" class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-400 transition-colors flex flex-col items-center">
        <h3 class="text-xl font-bold text-purple-400 mb-4">Solana (SOL)</h3>
        <div class="bg-white p-2 rounded-lg mb-4">
            <img :src="solQR" alt="Solana QR Code" class="w-40 h-40" />
        </div>
        <code @click="copyToClipboard(sol)" class="block w-full bg-gray-900 p-3 rounded text-sm font-mono text-gray-300 break-all cursor-pointer hover:bg-gray-700 transition-colors" title="Click to copy">
          {{ sol }}
        </code>
      </div>

      <!-- Litecoin -->
      <div v-if="ltc" class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-400 transition-colors flex flex-col items-center">
        <h3 class="text-xl font-bold text-gray-400 mb-4">Litecoin (LTC)</h3>
        <div class="bg-white p-2 rounded-lg mb-4">
            <img :src="ltcQR" alt="Litecoin QR Code" class="w-40 h-40" />
        </div>
        <code @click="copyToClipboard(ltc)" class="block w-full bg-gray-900 p-3 rounded text-sm font-mono text-gray-300 break-all cursor-pointer hover:bg-gray-700 transition-colors" title="Click to copy">
          {{ ltc }}
        </code>
      </div>
    </div>
  </div>
</template>