import { Event } from "./types";

export const events: Event[] = [
    {
        id: "1",
        title: "Bills Backers Victory Celebration",
        description: "Event at the main terminal of BUF Niagara Airport.",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCPfav1OllFr_kajK3jZaBw6hRWDZONKP5Vg&s",
        date: "2023-01-01",
        location: "Main Terminal, BUF Airport",
        creator: "Airport Staff",
        latitude: 42.9405, // Latitude for the main terminal
        longitude: -78.7322, // Longitude for the main terminal
        distance: 0.3,
    },
    {
        id: "2",
        title: "Sabers Group Therapy",
        description: "Event near the parking area of BUF Niagara Airport.",
        image: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Buffalo_Sabres_Logo.svg/1200px-Buffalo_Sabres_Logo.svg.png",
        date: "2023-02-01",
        location: "Parking Area, BUF Airport",
        creator: "Parking Manager",
        latitude: 42.9379, // Latitude for the parking area
        longitude: -78.7365, // Longitude for the parking area
        distance: 0.5,
    },
];
