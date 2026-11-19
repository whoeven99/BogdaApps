import assert from "node:assert/strict";
import test from "node:test";
import {
  contentImageId,
  isContentImageId,
  pickLatestContentPictureRow,
} from "./lib/contentPictureRow.mjs";

test("contentImageId 用 content: 前缀", () => {
  assert.equal(contentImageId("ext:cdn.judgeme.com/a.jpg"), "content:ext:cdn.judgeme.com/a.jpg");
  assert.equal(isContentImageId("content:ext:cdn.judgeme.com/a.jpg"), true);
  assert.equal(isContentImageId("gid://shopify/Product/1"), false);
});

test("pickLatestContentPictureRow 取未删除最新 id", () => {
  const rows = [
    { id: 1, isDelete: false, imageBeforeUrl: "https://a.com/1.jpg?a=1" },
    { id: 3, isDelete: true, imageBeforeUrl: "https://a.com/1.jpg?b=2" },
    { id: 2, isDelete: false, imageBeforeUrl: "https://a.com/1.jpg?c=3" },
  ];
  assert.equal(pickLatestContentPictureRow(rows)?.id, 2);
  assert.equal(pickLatestContentPictureRow([]), null);
  assert.equal(pickLatestContentPictureRow([{ id: 9, isDelete: true }]), null);
});
