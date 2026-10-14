
📝 Product Requirements Document (PRD)


1. Project Overview

• Project Name: PixelPet Code Companion
• Description: A cute, interactive frontend widget featuring a pixel-art pet that responds to user activity (typing code and checking off tasks). It provides gamified, heartwarming feedback to keep developers motivated.
• Tech Stack: Single-page application using HTML5, Tailwind CSS (for quick styling), and Vanilla JavaScript (no heavy frameworks required).

2. Core Features & User Stories

• Visual States: The pet has four distinct animations/states: Idle (breathing/blinking), Coding (happy/excited), Eating/LevelUp (hearts/sparkles), and Sleeping (Zzz particles).
• Activity Tracking:
	• A sandbox text area simulates a code editor. As the user types, the pet enters the Coding state and gains small EXP.
	• A mini to-do list. Checking off a task feeds the pet a treat, giving a large EXP boost.
• Idle Mechanics: If no keys are pressed for 60 seconds, the pet falls asleep. Typing immediately wakes it up.
• Progression System: Leveling up increases the pet's size slightly or unlocks small cosmetic badges (e.g., Level 1: Egg/Blob, Level 2: Child Pet, Level 3: Developer Pet).
• Persistence: Uses localStorage to save the pet's current level, EXP, and custom name so progress isn't lost on page refresh.

3. UI/UX Design Goals

• Aesthetic: Cozy, retro-pixel or pastel aesthetic (soft pinks, mint greens, or dark cyber-cozy theme).
• Layout: A split or compact screen. Left side: The simulated code editor and to-do list. Right side: The floating pet widget container with an EXP bar.
