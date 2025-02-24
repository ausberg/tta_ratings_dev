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

### **CO**
- The player's country.

### **C Rating**
- Calculated as `Rating - (3 * RD)`, ensuring a more stable ranking for players with high uncertainty.
- Used to sort players on the leaderboard.

### **CRΔ**
- The change in a player's Conservative Rating since the start of the rating period.

### **E Rating**
- The player's estimated skill level.

### **ERΔ**
- The change in a player's E Rating since the start of the rating period.

### **RD (Rating Deviation)**
- Represents the uncertainty of the player's rating.
- Lower values mean the rating is more stable, while higher values indicate fewer recent games.

### **RDΔ**
- The change in a player's Rating Deviation since the start of the rating period.

### **Opps**
- The total number of opponents the player has faced.

### **OΔ**
- The change in the number of opponents faced since the start of the rating period.

### **Ws**
- The total number of games the player has won.

### **WsΔ**
- The change in the number of wins since the start of the rating period.

### **Ls**
- The total number of games the player has lost.

### **LsΔ**
- The change in the number of losses since the start of the rating period.

### **Ds**
- The total number of games that ended in a draw.

### **DΔ**
- The change in the number of draws since the start of the rating period.

### **W%**
- The percentage of games the player has won, calculated as:
  ```
  Win% = (Wins / (Wins + Losses + Draws)) * 100
  ```

### **W%Δ**
- The change in a player's Win Percentage since the start of the rating period.

---

For more details, visit the [GitHub repository](https://github.com/ausberg/tta_ratings_dev).

