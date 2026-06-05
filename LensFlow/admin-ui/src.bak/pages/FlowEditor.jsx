import React from 'react';
import { useParams } from 'react-router-dom';

export default function FlowEditor() {
  const { id } = useParams();
  return <h1>Flow Editor for Flow ID: {id}</h1>;
}
