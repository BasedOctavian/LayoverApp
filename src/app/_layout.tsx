import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { AntDesign, MaterialIcons } from '@expo/vector-icons'; // Import the required icons
import "../../global.css";

export default function RootLayout() {
    return (
        <Stack>
            <Stack.Screen 
                name="index" 
                options={{
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: "black", // Background color of the top bar
                        // Height of the top bar
                    },
                    headerLeft: () => (
                        <TouchableOpacity style={{ marginLeft: 10 }}>
                            <MaterialIcons name="menu" size={30} color="white" /> {/* Hamburger menu icon */}
                        </TouchableOpacity>
                    ),
                    
                    headerTitle: () => (
                        <TouchableOpacity style={{ alignItems: 'center', backgroundColor: 'black' }}>
                            <AntDesign name="home" size={30} color="white" /> {/* Home icon in the center */}
                        </TouchableOpacity>
                    ),
                }} 
            />
            <Stack.Screen 
                name="search" 
                options={{
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: "black", // Background color of the top bar
                        // Height of the top bar
                    },
                    headerLeft: () => (
                        <TouchableOpacity style={{ marginLeft: 10 }}>
                            <MaterialIcons name="menu" size={30} color="white" /> {/* Hamburger menu icon */}
                        </TouchableOpacity>
                    ),
                    
                    headerTitle: () => (
                        <TouchableOpacity style={{ alignItems: 'center', backgroundColor: 'black' }}>
                            <AntDesign name="home" size={30} color="white" /> {/* Home icon in the center */}
                        </TouchableOpacity>
                    ),
                }} 
            />
        </Stack>
    );
}
