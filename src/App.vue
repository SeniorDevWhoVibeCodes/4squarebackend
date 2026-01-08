<script setup lang="ts">
import { onMounted } from 'vue'
import { initFlowbite } from 'flowbite'
import { RouterLink, RouterView } from 'vue-router'

onMounted(() => {
  initFlowbite();
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <nav class="bg-gray-800 border-gray-700">
      <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <RouterLink to="/" class="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="@/assets/logo.png" class="h-8" alt="4Square Logo" />
          <span class="self-center text-2xl font-semibold whitespace-nowrap text-white">4Square</span>
        </RouterLink>
        <button data-collapse-toggle="navbar-default" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm rounded-lg md:hidden focus:outline-none focus:ring-2 text-gray-400 hover:bg-gray-700 focus:ring-gray-600" aria-controls="navbar-default" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
        </button>
        <div class="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border rounded-lg md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 bg-gray-800 md:bg-gray-800 border-gray-700">
            <li>
              <RouterLink to="/" class="block py-2 px-3 rounded-sm md:border-0 md:p-0 text-white md:hover:text-green-400 hover:bg-gray-700 hover:text-white md:hover:bg-transparent" active-class="text-green-400">Home</RouterLink>
            </li>
            <li>
              <RouterLink to="/about" class="block py-2 px-3 rounded-sm md:border-0 md:p-0 text-white md:hover:text-green-400 hover:bg-gray-700 hover:text-white md:hover:bg-transparent" active-class="text-green-400">What is 4-Square?</RouterLink>
            </li>
            <li>
              <RouterLink to="/tip" class="block py-2 px-3 rounded-sm md:border-0 md:p-0 text-white md:hover:text-green-400 hover:bg-gray-700 hover:text-white md:hover:bg-transparent" active-class="text-green-400">Support / Tip</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <div class="container mx-auto p-4">
      <RouterView />
    </div>
  </div>
</template>