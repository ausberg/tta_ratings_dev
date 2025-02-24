# Column Definitions for TTA Ratings Table

This document provides definitions for each column in the ratings table to help users interpret the data correctly.

## Table Columns

### **Rank**
- The player's position on the leaderboard based on their Conservative Rating.
- Lower numbers indicate a higher ranking.
- "-" denotes inactive players.

### **Rank Δ**
- The change in a player's position on the leaderboard since the start of the rating period.

### **Title**
- The highest division ever reached by a player in the International or Intermezzo tournament.
- GM: Grandmaster
- M: Master
- P: Platinum
- Gold and Silver to be added soon

### **Player**
- The name of the player.

### **C Rating**
- Calculated as `Rating - (3 * RD)`, ensuring a more stable ranking for players with high uncertainty.
- Used to sort players on the leaderboard.

### **C R Δ**
- The change in a player's Conservative Rating since the start of the rating period.

### **E Rating**
- The player's estimated skill level.

### **E R Δ**
- The change in a player's E Rating since the start of the rating period.

### **RD (Rating Deviation)**
- Represents the uncertainty of the player's rating.
- Lower values mean the rating is more stable, while higher values indicate fewer recent games.

### **RD Δ**
- The change in a player's Rating Deviation since the start of the rating period.

### **Opponents**
- The total number of opponents the player has faced.

### **O Δ**
- The change in the number of opponents faced since the start of the rating period.

### **Wins**
- The total number of games the player has won.

### **Wins Δ**
- The change in the number of wins since the start of the rating period.

### **Losses**
- The total number of games the player has lost.

### **Losses Δ**
- The change in the number of losses since the start of the rating period.

### **Draws**
- The total number of games that ended in a draw.

### **Draws Δ**
- The change in the number of draws since the start of the rating period.

### **Win%**
- The percentage of games the player has won, calculated as:
  ```
  Win% = (Wins / (Wins + Losses + Draws)) * 100
  ```

### **Win% Δ**
- The change in a player's Win Percentage since the start of the rating period.

---

For more details, visit the [GitHub repository](https://github.com/ausberg/tta_ratings).

