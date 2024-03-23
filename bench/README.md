## Benchmarks

We are still trying to find a fair way to compare the performance of various
Nostr libraries. You should NOT consider the current results reliable.

### Method

WIP

### Results

```sh
cpu: Intel(R) Core(TM) i7-7600U CPU @ 2.80GHz
runtime: deno 1.41.3 (x86_64-unknown-linux-gnu)

file:///home/hasundue/lophus/bench/bench.ts
benchmark        time (avg)        iter/s             (min … max)       p75       p99      p995
----------------------------------------------------------------- -----------------------------

# Time to deliver a request to a relay
group subscribe
lophus           52.32 µs/iter      19,111.7    (18.74 µs … 6.17 ms) 52.78 µs 132.19 µs 165.39 µs
nostr_tools      49.33 µs/iter      20,270.0  (38.33 µs … 182.21 µs) 49.32 µs 111.07 µs 133.75 µs

summary
  lophus
   1.06x slower than nostr_tools

# Time to get an event from a relay
group get an event
lophus            56.3 µs/iter      17,761.7     (27.8 µs … 8.69 ms) 44.75 µs 119.7 µs 166.07 µs
nostr_tools       2.44 ms/iter         409.6     (2.11 ms … 4.93 ms) 2.34 ms 4.4 ms 4.93 ms

summary
  lophus
   43.36x faster than nostr_tools
```
