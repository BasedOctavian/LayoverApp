import React, { useEffect, useState } from "react";
import { View, TextInput, Button, Text, ActivityIndicator, Alert, StyleSheet } from "react-native";
import useAuth from "../hooks/auth"; // Adjust the path to your hook file
import useFirestore from "../hooks/useFirestore";

const LoginScreen = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const { user, loading, error, login } = useAuth();




  useEffect(() => {
    if (user) {
      console.log("User logged in:", user);
    }
    else if (!user) {
      console.log("User not logged in");
    }
  }, [user]);



  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    await login(email, password);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  if (error) {
    Alert.alert("Error", error);
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />
      {user && <Text style={styles.welcomeText}>Welcome, {user.email}!</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  input: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  welcomeText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
  },
});

export default LoginScreen;