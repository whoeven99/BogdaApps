import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Button 
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useSelector, useDispatch } from "react-redux";
import { increment, decrement, reset } from '../../store/modules/countSlice';
import { useEffect } from "react";
import { RootState } from "app/store";




export default function AdditionalPage() {
  const count = useSelector((state: RootState) => state.count);
  console.log('count',count);
  useEffect(() => {
    console.log('Count has changed:', count);
  }, [count]);
  const dispatch = useDispatch();

  return (
    <Page>
      <TitleBar title="Additional page" />
      <Layout>
        <Layout.Section>
          <Card>
            <p>Count: {count}</p>
            <Button onClick={() => dispatch(increment())}>+1</Button>
            <Button onClick={() => dispatch(decrement())}>-1</Button>
            <Button onClick={() => dispatch(reset())}>Reset</Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}