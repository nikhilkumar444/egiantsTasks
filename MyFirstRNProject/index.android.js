/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

export default class MyFirstRNProject extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
        Nikhil's First React-Native Application.
        </Text>
        <Text style={styles.instructions}>
          This is ANDROID based application.
        </Text>
        <Text style={styles.instructions}>
          This Task was given by KRISHNA Sir,{'\n'}
          By E-GIANTS TECHNOLOGIES LLC.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('MyFirstRNProject', () => MyFirstRNProject);
