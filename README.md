# Installation



# Running

# TODO
-

# Limitations / problems

Orderbook size - it's stored as a js object, storage / perf is an issue

Orderbook service:

gets around race condition by putting order service as a central place of matching orders. It's a single point of failure, and hence not HA.

Future improvement: consensus / eventual consistency.

If the server (service) stops, and is restarted on a different port, the client doesn't seem to pick that up. Need to look into why/what's wrong. (repro/screenshots)

# Next steps