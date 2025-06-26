import React from 'react';

const reactDom = jest.requireActual('react-dom');

module.exports = {
  ...reactDom,
  createPortal: jest.fn((children) => children),
};
