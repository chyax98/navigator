function clearStorage() {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    return;
  }

  chrome.storage.local.clear(() => {
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'success';
    resultDiv.innerHTML = `
      <strong>✅ 存储已清空</strong><br>
      请刷新页面开始测试
    `;
  });
}

function viewStorage() {
  chrome.storage.local.get(null, (result) => {
    const keys = Object.keys(result);
    const ids = result.navigator_bookmark_ids || [];

    let bookmarkInfo = '';
    ids.forEach(id => {
      const bookmark = result[`navigator_bookmark_${id}`];
      if (bookmark) {
        bookmarkInfo += `
          <div style="border-left: 3px solid ${bookmark.isPinned ? '#4CAF50' : '#ccc'}; padding-left: 10px; margin: 10px 0;">
            <strong>${bookmark.title}</strong><br>
            <small>
              isPinned: ${bookmark.isPinned}<br>
              pinnedAt: ${bookmark.pinnedAt || '无'}
            </small>
          </div>
        `;
      }
    });

    const resultDiv = document.getElementById('result');
    resultDiv.className = 'info';
    resultDiv.innerHTML = `
      <h3>当前存储状态</h3>
      <p><strong>存储键数量：</strong>${keys.length}</p>
      <p><strong>书签数量：</strong>${ids.length}</p>
      <p><strong>置顶书签数量：</strong>${ids.filter(id => result[`navigator_bookmark_${id}`]?.isPinned).length}</p>
      <h4>书签列表：</h4>
      ${bookmarkInfo || '<p>暂无书签</p>'}
    `;
  });
}

// 绑定事件
document.getElementById('clearBtn').addEventListener('click', clearStorage);
document.getElementById('viewBtn').addEventListener('click', viewStorage);

// 页面加载时自动查看
viewStorage();
