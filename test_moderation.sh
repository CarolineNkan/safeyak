#!/bin/bash

# Test the moderation API with various examples

echo "Testing SafeYak Moderation API"
echo "================================"
echo ""

# Test 1: Doxxing (should hide)
echo "Test 1: Doxxing"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "Hey John Smith in room 204, I saw you yesterday!"}' \
  -s | jq
echo ""

# Test 2: Harassment (should blur)
echo "Test 2: Harassment"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "You are such a loser, everyone hates you"}' \
  -s | jq
echo ""

# Test 3: Mild profanity (should allow)
echo "Test 3: Mild profanity"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "This exam was damn hard"}' \
  -s | jq
echo ""

# Test 4: NSFW (should blur)
echo "Test 4: NSFW content"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "Looking for hookups tonight, DM me"}' \
  -s | jq
echo ""

# Test 5: Clean content (should allow)
echo "Test 5: Clean content"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "Anyone want to study for the math final together?"}' \
  -s | jq
echo ""

# Test 6: Illegal activity (should hide)
echo "Test 6: Illegal activity"
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "Selling fake IDs, hit me up"}' \
  -s | jq
echo ""
