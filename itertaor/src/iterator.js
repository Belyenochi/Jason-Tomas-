let tree = {
	value: 5,
	left: {
		value: 4,
		left: '',
		right: ''
	},
	right: {
		value: 8,
		left: {
			value: 6,
			left: '',
			right: ''
		},
		right: ''
	}
}

function* inOrder(node) {
	let x;

	if (node) {
		for (x of inOrder(node.left)) {
			yield x;
		}
		yield node.value;
		for (x of inOrder(node.right)) {
			yield x;
		}
	}
}

let test = inOrder(tree),result = [];
for(i of test) {
	if (i < 5) {
		result.push(i);
	}
}
console.log(result); // [4]

function inorder_traverse(node,condition,result) {
	if (node) {
		inorder_traverse(node.left);
		if (condition(node.value)) {
     	result.push(result);
     };
    inorder_traverse(node.right);
	}
}

function makeTreeIterator(node){
  let controlStack = [];

	((function InorderIterator(currNode) {
			// 将当前节点的所有左子节点入栈
      while (currNode) {
          controlStack.push(currNode);
          currNode = currNode.left;
      }
  })(node))

  return {
    next: function(){
      if (controlStack.length) {
      	// 取出当前节点
       	let top = controlStack.pop();

       	if (top.right) {
       		let currNode = top.right;

					// 将当前节点的右子节点的所有左子节点压栈
       		while (currNode) {
       			controlStack.push(currNode);
       			currNode = currNode.left;
       		}
       	}

       	return {value: top.value, done: false};
      } else {
      	return {done: true};
      }
  	}
	}
}

// 基于栈的非递归查询算法的实现
function inorder_tarverse_nonrecursive(node,condition,result) {
	let stack = [];

	while (true) {
		// 压入所有左子节点
		while (node) {
			stack.push(node);
		  node = node.left;
		}
		// Pop出左子节点，进入右子节点或者返回父节点
		while (true) {
			let top = stack.pop();
			if (condition(top)) {
				result.push(top.value);
			}
			if (top.right) {
				node = top.right;
				break;
			}
			// 此时根节点和根中所有左子节点已经遍历完毕
			if (stack.length === 0) {
				break;
			}
		}
		// 遍历完毕所有节点
		if (stack.length === 0) {
			break;
		}
	}
}
