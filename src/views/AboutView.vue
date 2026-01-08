<template>
  <div class="max-w-4xl mx-auto p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-gray-300">
    <h1 class="text-3xl font-bold text-green-400 mb-6">What is a 4-Square?</h1>
    
    <section class="mb-8 space-y-4">
      <p class="leading-relaxed">
        In the context of prediction markets like Kalshi, a <strong class="text-white">4-Square</strong> (or multi-option arbitrage) 
        refers to an event where multiple mutually exclusive outcomes are priced such that the total cost of 
        buying "Yes" on enough options to cover all possibilities is less than the payout.
      </p>
      <p class="leading-relaxed">
        This tool specifically looks for events with 2 to 4 options where the "Top 2" most likely outcomes 
        can be covered for a combined cost of less than 80¢, potentially offering a high-probability 
        arbitrage or "middle" opportunity.
      </p>
    </section>

    <section>
      <h2 class="text-2xl font-semibold text-green-400 mb-4">How it works</h2>
      <ul class="list-disc pl-6 space-y-2">
        <li>We scan all open Kalshi markets.</li>
        <li>We group markets by their event ticker.</li>
        <li>We filter for events with 2-4 strikes.</li>
        <li>We calculate the combined cost of the most expensive options.</li>
        <li>We highlight opportunities where the math works in your favor.</li>
      </ul>
    </section>
  </div>
</template>
