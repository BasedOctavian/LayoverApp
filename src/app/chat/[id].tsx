import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function Chat() {
    const { id } = useLocalSearchParams();
    console.log(id);

    return (
        <Text>Chat with {id}</Text>
    )

}